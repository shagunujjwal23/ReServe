"""Image upload and serving endpoints."""

from pathlib import Path
from uuid import uuid4

from flask import Blueprint, jsonify, request, send_from_directory


upload = Blueprint("upload", __name__)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
UPLOAD_DIRECTORY = Path(__file__).resolve().parent.parent / "uploads"


def _is_allowed_file(filename: str) -> bool:
    """Return whether a filename has a permitted image extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _get_file_size(file_storage) -> int:
    """Measure an uploaded file without consuming its stream."""
    stream = file_storage.stream
    stream.seek(0, 2)
    file_size = stream.tell()
    stream.seek(0)
    return file_size


@upload.route("/api/upload-image", methods=["POST"])
def upload_image():
    """Validate and save one uploaded food-listing image."""
    if "image" not in request.files:
        return jsonify({"success": False, "message": "Image file is required."}), 400

    image_file = request.files["image"]
    if not image_file.filename:
        return jsonify({"success": False, "message": "Image file is required."}), 400

    if not _is_allowed_file(image_file.filename):
        return jsonify({
            "success": False,
            "message": "Invalid file type. Allowed types: jpg, jpeg, png, webp."
        }), 400

    try:
        if _get_file_size(image_file) > MAX_FILE_SIZE:
            return jsonify({
                "success": False,
                "message": "File is too large. Maximum size is 5 MB."
            }), 413

        extension = image_file.filename.rsplit(".", 1)[1].lower()
        unique_filename = f"{uuid4().hex}.{extension}"
        UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
        image_file.save(UPLOAD_DIRECTORY / unique_filename)
    except (OSError, ValueError):
        return jsonify({
            "success": False,
            "message": "The image could not be saved. Please try again later."
        }), 500

    return jsonify({
        "success": True,
        "image_url": f"/uploads/{unique_filename}",
    }), 201


@upload.route("/uploads/<filename>", methods=["GET"])
def serve_uploaded_image(filename: str):
    """Serve an uploaded image from the application's upload directory."""
    return send_from_directory(UPLOAD_DIRECTORY, filename)
