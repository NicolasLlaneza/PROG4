from sqlmodel import Session, select
from app.core.database import engine
from app.core.security import hash_password
from app.modules.usuarios.models import Rol, Usuario, UsuarioRol
from app.modules.unidad_medida.models import UnidadMedida
from app.modules.pedidos.models import EstadoPedido, FormaPago

# Roles del sistema (UML)
ROLES_SEED = [
    Rol(codigo="ADMIN",   nombre="Administrador",  descripcion="Acceso total sin restricciones"),
    Rol(codigo="STOCK",   nombre="Stock",           descripcion="Actualiza stock y disponibilidad"),
    Rol(codigo="PEDIDOS", nombre="Pedidos",         descripcion="Avanza estados confirmado → entregado"),
    Rol(codigo="CLIENT",  nombre="Cliente",         descripcion="Opera solo sus propios datos"),
]

# Unidades de medida del catalogo inicial (UML)
UNIDADES_SEED = [
    UnidadMedida(nombre="kilogramo",      simbolo="kg",  tipo="masa"),
    UnidadMedida(nombre="gramo",          simbolo="g",   tipo="masa"),
    UnidadMedida(nombre="litro",          simbolo="L",   tipo="volumen"),
    UnidadMedida(nombre="mililitro",      simbolo="mL",  tipo="volumen"),
    UnidadMedida(nombre="pieza",          simbolo="u",   tipo="unidad"),
    UnidadMedida(nombre="docena",         simbolo="doc", tipo="unidad"),
    UnidadMedida(nombre="metro cuadrado", simbolo="m²",  tipo="área"),
]

# Estados del pedido con su orden en la FSM (UML)
ESTADOS_SEED = [
    EstadoPedido(codigo="pendiente",      descripcion="Pendiente de confirmación", orden=1, es_terminal=False),
    EstadoPedido(codigo="confirmado",     descripcion="Confirmado",               orden=2, es_terminal=False),
    EstadoPedido(codigo="en_preparacion", descripcion="En preparación",           orden=3, es_terminal=False),
    EstadoPedido(codigo="en_camino",      descripcion="En camino",                orden=4, es_terminal=False),
    EstadoPedido(codigo="entregado",      descripcion="Entregado",                orden=5, es_terminal=True),
    EstadoPedido(codigo="cancelado",      descripcion="Cancelado",                orden=6, es_terminal=True),
]

# Formas de pago (UML)
FORMAS_PAGO_SEED = [
    FormaPago(codigo="MERCADOPAGO",   descripcion="Checkout API - card payment SDK", habilitado=True),
    FormaPago(codigo="EFECTIVO",      descripcion="Retiro en local",                 habilitado=True),
    FormaPago(codigo="TRANSFERENCIA", descripcion="Transferencia bancaria",          habilitado=True),
]


def run_seed() -> None:
    with Session(engine) as session:
        for rol in ROLES_SEED:
            if not session.get(Rol, rol.codigo):
                session.add(rol)

        existentes_u = {u.simbolo for u in session.exec(select(UnidadMedida)).all()}
        for unidad in UNIDADES_SEED:
            if unidad.simbolo not in existentes_u:
                session.add(unidad)

        for estado in ESTADOS_SEED:
            if not session.get(EstadoPedido, estado.codigo):
                session.add(estado)

        for forma in FORMAS_PAGO_SEED:
            if not session.get(FormaPago, forma.codigo):
                session.add(forma)

        # Usuario admin inicial
        admin = session.exec(select(Usuario).where(Usuario.email == "admin@admin.com")).first()
        if not admin:
            admin = Usuario(
                nombre="Admin",
                apellido="Sistema",
                email="admin@admin.com",
                celular=None,
                password_hash=hash_password("admin1234"),
            )
            session.add(admin)
            session.flush()
            session.add(UsuarioRol(
                usuario_id=admin.id,
                rol_codigo="ADMIN",
            ))

        session.commit()
        print("Seed completado.")


if __name__ == "__main__":
    run_seed()
