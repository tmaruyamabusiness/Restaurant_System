import socketio
from app.config import get_settings

settings = get_settings()

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=settings.DEBUG,
    engineio_logger=settings.DEBUG,
)


@sio.event
async def connect(sid, environ):
    pass


@sio.event
async def disconnect(sid):
    pass


@sio.event
async def join_room(sid, data):
    room = data.get("room", "default")
    sio.enter_room(sid, room)


@sio.event
async def leave_room(sid, data):
    room = data.get("room", "default")
    sio.leave_room(sid, room)


async def emit_seat_status_changed(seat_id: str, status: str, session_data: dict):
    await sio.emit("seat_status_changed", {
        "seat_id": seat_id,
        "status": status,
        "session": session_data,
    })


async def emit_new_order(order_data: dict):
    await sio.emit("new_order", order_data)


async def emit_order_item_status_changed(item_id: str, status: str, order_id: str):
    await sio.emit("order_item_status_changed", {
        "item_id": item_id,
        "status": status,
        "order_id": order_id,
    })


async def emit_takeout_status_changed(takeout_id: str, status: str):
    await sio.emit("takeout_status_changed", {
        "takeout_id": takeout_id,
        "status": status,
    })
