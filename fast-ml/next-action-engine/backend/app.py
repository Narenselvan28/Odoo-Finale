"""
DealFlow360 - Next Action Prediction / Recommendation Engine
Flask Application Server
"""

import sys
import os
import logging
from pathlib import Path
from flask import Flask, send_from_directory, redirect
from flask_cors import CORS

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

from config import Config
from database import init_db
from routes.action_routes import action_bp
from routes.prediction_routes import prediction_bp
from routes.training_routes import training_bp
from routes.anticipatory_routes import anticipation_bp
from ml.model_manager import model_manager

# Logging setup
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger("dealflow360-next-action")


def create_app():
    """Application factory for Next Action Recommendation Backend."""
    frontend_dir = Config.ROOT_DIR / "frontend"
    app = Flask(__name__, static_folder=str(frontend_dir), static_url_path="")

    # CORS configuration
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize SQLite Database & ERP Seeds
    init_db()

    # Register Route Blueprints
    app.register_blueprint(action_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(training_bp)
    app.register_blueprint(anticipation_bp)

    # Static Frontend Page Routes
    @app.route("/")
    def index():
        return send_from_directory(str(frontend_dir), "dashboard.html")

    @app.route("/<path:filename>")
    def serve_frontend_files(filename):
        return send_from_directory(str(frontend_dir), filename)

    return app


app = create_app()

if __name__ == "__main__":
    logger.info(f"Starting Next Action Recommendation Engine on http://{Config.HOST}:{Config.PORT}")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
