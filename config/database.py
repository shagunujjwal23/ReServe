"""MongoDB connection helpers for the ReServe application."""

from __future__ import annotations

import logging
import os
from typing import Optional

from flask import Flask
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError


logger = logging.getLogger(__name__)

mongo_client: Optional[MongoClient] = None
db: Optional[Database] = None


def init_mongo(app: Flask) -> None:
    """Initialise the MongoDB client without preventing Flask from starting.

    The connection is verified during startup so connection failures are logged
    clearly.  The application can still serve its existing template pages if
    MongoDB is temporarily unavailable.
    """
    global mongo_client, db

    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    database_name = os.getenv("MONGO_DB_NAME", "reserve_db")

    try:
        mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command("ping")
        db = mongo_client[database_name]
        app.extensions["mongo_db"] = db
        logger.info("Connected to MongoDB database '%s'.", database_name)
    except PyMongoError as error:
        mongo_client = None
        db = None
        app.extensions["mongo_db"] = None
        logger.error("MongoDB connection could not be established: %s", error)


def get_database() -> Optional[Database]:
    """Return the configured database, or ``None`` when MongoDB is unavailable."""
    return db


def get_collection(collection_name: str):
    """Return a collection by name, or ``None`` when no database is connected."""
    if db is None:
        logger.warning("Collection '%s' requested while MongoDB is unavailable.", collection_name)
        return None

    return db[collection_name]
