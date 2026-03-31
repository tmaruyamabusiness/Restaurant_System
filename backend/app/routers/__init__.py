from app.routers.auth import router as auth_router
from app.routers.seats import router as seats_router
from app.routers.orders import router as orders_router
from app.routers.takeout import router as takeout_router
from app.routers.payments import router as payments_router
from app.routers.menu import router as menu_router
from app.routers.reports import router as reports_router
from app.routers.kds import router as kds_router
from app.routers.users import router as users_router
from app.routers.settings import router as settings_router

all_routers = [
    auth_router,
    seats_router,
    orders_router,
    takeout_router,
    payments_router,
    menu_router,
    reports_router,
    kds_router,
    users_router,
    settings_router,
]
