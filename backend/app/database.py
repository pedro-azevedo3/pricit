import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg://izyprice:izyprice@localhost:5432/izyprice')
# Railway supplies a standard PostgreSQL URL; this app uses psycopg v3.
if DATABASE_URL.startswith(('postgresql://', 'postgres://')):
    DATABASE_URL = 'postgresql+psycopg://' + DATABASE_URL.split('://', 1)[1]
engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False, hide_parameters=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    with SessionLocal() as session:
        yield session
