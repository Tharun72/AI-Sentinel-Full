from app.database.database import Base, engine
from app.database.base import *


def init_db():
    Base.metadata.create_all(bind=engine)