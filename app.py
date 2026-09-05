"""
DealFlow360 - Intelligent, Self-Governing Sales Operations Platform
Machine Learning Inference API Service (Flask)
"""

import os
import logging
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from utils.error_handlers import register_error_handlers
from routes.meta import meta_bp
from routes.classifier import classifier_bp
from routes.regressor import regressor_bp

# Load environment configuration
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("dealflow360-ml-api")


def create_app():
    """Application factory for DealFlow360 ML API."""
    app = Flask(__name__)

    # Configure CORS
    cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173")
    if cors_origins_env.strip() == "*":
        cors_origins = "*"
    else:
        cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

    CORS(app, resources={r"/*": {"origins": cors_origins}})
    logger.info(f"CORS initialized with allowed origins: {cors_origins}")

    # Register Error Handlers
    register_error_handlers(app)

    # Register Route Blueprints
    app.register_blueprint(meta_bp)
    app.register_blueprint(classifier_bp)
    app.register_blueprint(regressor_bp)

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    logger.info(f"Starting DealFlow360 ML API on http://{host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)
