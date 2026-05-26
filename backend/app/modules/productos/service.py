from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlmodel import Session
from app.modules.productos.models import Producto, ProductoCategoria, ProductoIngrediente
from app.modules.productos.schemas import (
    ProductoCreate, ProductoPublic, ProductoUpdate, ProductoList,
    ProductoConDetalle, ProductoCategoriaCreate, ProductoCategoriaPublic,
    ProductoIngredienteCreate, ProductoIngredientePublic,
)
from app.modules.categorias.schemas import CategoriaPublic
from app.modules.ingredientes.schemas import IngredientePublic
from app.modules.unidad_medida.schemas import UnidadMedidaPublic
from app.modules.productos.unit_of_work import ProductoUnitOfWork


def calcular_stock_derivado(producto: Producto) -> int:
    """Cuantas unidades del producto se pueden fabricar con el stock actual de
    sus ingredientes.

    stock_producto = min(floor(ingrediente.stock / cantidad_requerida)) para
    cada ingrediente. Si el producto no tiene ingredientes asociados (ej: una
    bebida embotellada que se vende como insumo), cae al stock_cantidad
    almacenado manualmente.
    """
    pis = list(producto.producto_ingredientes or [])
    if not pis:
        return producto.stock_cantidad

    posibles: list[int] = []
    for pi in pis:
        if pi.ingrediente is None or pi.cantidad <= 0:
            continue
        posibles.append(int(pi.ingrediente.stock_cantidad // pi.cantidad))

    if not posibles:
        return producto.stock_cantidad
    return min(posibles)


def calcular_costo_estimado(producto: Producto) -> float:
    """Suma del costo de cada ingrediente segun el precio actual del insumo.
    Si sube el precio del queso, sube el costo de la pizza automaticamente.
    """
    total = 0.0
    for pi in (producto.producto_ingredientes or []):
        if pi.ingrediente is not None:
            total += pi.cantidad * pi.ingrediente.precio_por_unidad
    return round(total, 2)


class ProductoService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _get_or_404(self, uow, producto_id: int) -> Producto:
        p = uow.productos.get_by_id(producto_id)
        if not p or p.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Producto id={producto_id} no encontrado")
        return p

    def _build_detalle(self, uow, producto_id: int) -> ProductoConDetalle:
        p = uow.productos.get_by_id_con_detalle(producto_id)
        if not p or p.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Producto id={producto_id} no encontrado")

        unidad_venta = None
        if p.unidad_venta_id:
            u = uow.unidades.get_by_id(p.unidad_venta_id)
            if u:
                unidad_venta = UnidadMedidaPublic.model_validate(u)

        categorias = [
            ProductoCategoriaPublic(
                categoria_id=pc.categoria_id,
                es_principal=pc.es_principal,
                categoria=CategoriaPublic.model_validate(pc.categoria) if pc.categoria else None,
            )
            for pc in p.producto_categorias
        ]

        # costo de cada linea = cantidad usada * precio_por_unidad
        ingredientes = []
        for pi in p.producto_ingredientes:
            costo_ing = pi.cantidad * pi.ingrediente.precio_por_unidad if pi.ingrediente else 0.0
            ingredientes.append(ProductoIngredientePublic(
                ingrediente_id=pi.ingrediente_id,
                cantidad=pi.cantidad,
                unidad_medida_id=pi.unidad_medida_id,
                es_removible=pi.es_removible,
                costo_ingrediente=round(costo_ing, 2),
                ingrediente=IngredientePublic.model_validate(pi.ingrediente) if pi.ingrediente else None,
            ))

        # stock y costo SIEMPRE derivados (no almacenados)
        stock_derivado = calcular_stock_derivado(p)
        costo_estimado = calcular_costo_estimado(p)

        return ProductoConDetalle(
            id=p.id,
            nombre=p.nombre,
            descripcion=p.descripcion,
            precio_base=p.precio_base,
            stock_cantidad=stock_derivado,
            disponible=p.disponible,
            unidad_venta_id=p.unidad_venta_id,
            unidad_venta=unidad_venta,
            categorias=categorias,
            ingredientes=ingredientes,
            costo_estimado=costo_estimado,
            created_at=p.created_at,
        )

    def create(self, data: ProductoCreate) -> ProductoPublic:
        with ProductoUnitOfWork(self._session) as uow:
            if data.unidad_venta_id:
                if not uow.unidades.get_by_id(data.unidad_venta_id):
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                        detail=f"UnidadMedida id={data.unidad_venta_id} no encontrada")
            p = Producto.model_validate(data)
            uow.productos.add(p)
            result = ProductoPublic.model_validate(p)
        return result

    def get_all(self, offset: int = 0, limit: int = 20) -> ProductoList:
        with ProductoUnitOfWork(self._session) as uow:
            # Eager-load ingredientes para derivar stock y costo en la lista
            productos = uow.productos.get_active_con_ingredientes(offset=offset, limit=limit)
            total = uow.productos.count()
            items = [
                ProductoPublic(
                    id=p.id,
                    nombre=p.nombre,
                    descripcion=p.descripcion,
                    precio_base=p.precio_base,
                    stock_cantidad=calcular_stock_derivado(p),
                    disponible=p.disponible,
                    unidad_venta_id=p.unidad_venta_id,
                    costo_estimado=calcular_costo_estimado(p),
                    created_at=p.created_at,
                )
                for p in productos
            ]
            result = ProductoList(items=items, total=total, skip=offset, limit=limit)
        return result

    def get_by_id(self, producto_id: int) -> ProductoConDetalle:
        with ProductoUnitOfWork(self._session) as uow:
            result = self._build_detalle(uow, producto_id)
        return result

    def update(self, producto_id: int, data: ProductoUpdate) -> ProductoPublic:
        with ProductoUnitOfWork(self._session) as uow:
            p = self._get_or_404(uow, producto_id)
            if data.unidad_venta_id and data.unidad_venta_id != p.unidad_venta_id:
                if not uow.unidades.get_by_id(data.unidad_venta_id):
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                        detail=f"UnidadMedida id={data.unidad_venta_id} no encontrada")
            for field, value in data.model_dump(exclude_unset=True).items():
                setattr(p, field, value)
            p.updated_at = datetime.now(timezone.utc)
            uow.productos.add(p)
            result = ProductoPublic.model_validate(p)
        return result

    def delete(self, producto_id: int) -> None:
        with ProductoUnitOfWork(self._session) as uow:
            p = self._get_or_404(uow, producto_id)
            p.deleted_at = datetime.now(timezone.utc)
            uow.productos.add(p)

    def agregar_categoria(self, producto_id: int, data: ProductoCategoriaCreate) -> ProductoConDetalle:
        with ProductoUnitOfWork(self._session) as uow:
            self._get_or_404(uow, producto_id)
            if not uow.categorias.get_by_id(data.categoria_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                    detail=f"Categoria id={data.categoria_id} no encontrada")
            if uow.producto_categorias.get_by_ids(producto_id, data.categoria_id):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                    detail="El producto ya tiene esa categoría")
            if data.es_principal:
                principal = uow.producto_categorias.get_principal(producto_id)
                if principal:
                    principal.es_principal = False
                    uow.producto_categorias.add(principal)
            uow.producto_categorias.add(ProductoCategoria(
                producto_id=producto_id,
                categoria_id=data.categoria_id,
                es_principal=data.es_principal,
            ))
            result = self._build_detalle(uow, producto_id)
        return result

    def quitar_categoria(self, producto_id: int, categoria_id: int) -> ProductoConDetalle:
        with ProductoUnitOfWork(self._session) as uow:
            self._get_or_404(uow, producto_id)
            pc = uow.producto_categorias.get_by_ids(producto_id, categoria_id)
            if not pc:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                    detail="El producto no tiene esa categoría")
            uow.producto_categorias.delete(pc)
            result = self._build_detalle(uow, producto_id)
        return result

    def agregar_ingrediente(self, producto_id: int, data: ProductoIngredienteCreate) -> ProductoConDetalle:
        with ProductoUnitOfWork(self._session) as uow:
            self._get_or_404(uow, producto_id)
            if not uow.ingredientes.get_by_id(data.ingrediente_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                    detail=f"Ingrediente id={data.ingrediente_id} no encontrado")
            if not uow.unidades.get_by_id(data.unidad_medida_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                    detail=f"UnidadMedida id={data.unidad_medida_id} no encontrada")
            if uow.producto_ingredientes.get_by_ids(producto_id, data.ingrediente_id):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                    detail="El ingrediente ya está asociado al producto")
            uow.producto_ingredientes.add(ProductoIngrediente(
                producto_id=producto_id,
                ingrediente_id=data.ingrediente_id,
                cantidad=data.cantidad,
                unidad_medida_id=data.unidad_medida_id,
                es_removible=data.es_removible,
            ))
            result = self._build_detalle(uow, producto_id)
        return result

    def quitar_ingrediente(self, producto_id: int, ingrediente_id: int) -> ProductoConDetalle:
        with ProductoUnitOfWork(self._session) as uow:
            self._get_or_404(uow, producto_id)
            pi = uow.producto_ingredientes.get_by_ids(producto_id, ingrediente_id)
            if not pi:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                    detail="El ingrediente no está asociado al producto")
            uow.producto_ingredientes.delete(pi)
            result = self._build_detalle(uow, producto_id)
        return result
