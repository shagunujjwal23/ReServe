"""Image upload and serving endpoints."""

from pathlib import Path
from uuid import uuid4

from flask import (
    Blueprint,
    jsonify,
    request,
    send_from_directory,
)


# ==========================================================
# BLUEPRINT
# ==========================================================

upload = Blueprint("upload", __name__)


# ==========================================================
# CONFIGURATION
# ==========================================================

ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

UPLOAD_DIRECTORY = (
    Path(__file__).resolve().parent.parent / "uploads"
)


# ==========================================================
# FILE TYPE VALIDATION
# ==========================================================

def _is_allowed_file(filename: str) -> bool:
    """Return whether a filename has a permitted image extension."""

    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


# ==========================================================
# FILE SIZE
# ==========================================================

def _get_file_size(file_storage) -> int:
    """Measure an uploaded file without consuming its stream."""

    stream = file_storage.stream

    stream.seek(0, 2)
    file_size = stream.tell()
    stream.seek(0)

    return file_size


# ==========================================================
# UPLOAD IMAGE
# ==========================================================

@upload.route("/api/upload-image", methods=["POST"])
def upload_image():
    """
    Upload one provider profile image.

    Multiple profile images are supported by the frontend
    uploading each selected image separately.
    """

    # ------------------------------------------------------
    # CHECK FILE
    # ------------------------------------------------------

    if "image" not in request.files:
        return jsonify({
            "success": False,
            "message": "Image file is required.",
        }), 400

    image_file = request.files["image"]

    if not image_file.filename:
        return jsonify({
            "success": False,
            "message": "Image file is required.",
        }), 400

    # ------------------------------------------------------
    # CHECK EXTENSION
    # ------------------------------------------------------

    if not _is_allowed_file(
        image_file.filename
    ):
        return jsonify({
            "success": False,
            "message": (
                "Invalid file type. "
                "Allowed types: jpg, jpeg, png, webp."
            ),
        }), 400

    # ------------------------------------------------------
    # CHECK SIZE AND SAVE
    # ------------------------------------------------------

    try:

        file_size = _get_file_size(
            image_file
        )

        if file_size > MAX_FILE_SIZE:
            return jsonify({
                "success": False,
                "message": (
                    "File is too large. "
                    "Maximum size is 5 MB."
                ),
            }), 413

        # --------------------------------------------------
        # UNIQUE FILE NAME
        # --------------------------------------------------

        extension = (
            image_file
            .filename
            .rsplit(".", 1)[1]
            .lower()
        )

        unique_filename = (
            f"{uuid4().hex}.{extension}"
        )

        # --------------------------------------------------
        # CREATE UPLOAD DIRECTORY
        # --------------------------------------------------

        UPLOAD_DIRECTORY.mkdir(
            parents=True,
            exist_ok=True
        )

        # --------------------------------------------------
        # SAVE FILE
        # --------------------------------------------------

        image_file.save(
            UPLOAD_DIRECTORY / unique_filename
        )

    except (
        OSError,
        ValueError,
    ):

        return jsonify({
            "success": False,
            "message": (
                "The image could not be saved. "
                "Please try again later."
            ),
        }), 500

    # ------------------------------------------------------
    # RESPONSE
    # ------------------------------------------------------

    return jsonify({
        "success": True,
        "message": "Image uploaded successfully.",
        "image_url": (
            f"/uploads/{unique_filename}"
        ),
    }), 201


# ==========================================================
# SERVE UPLOADED IMAGE
# ==========================================================

@upload.route(
    "/uploads/<filename>",
    methods=["GET"]
)
def serve_uploaded_image(filename: str):
    """
    Serve an uploaded image from the upload directory.
    """

    return send_from_directory(
        UPLOAD_DIRECTORY,
        filename
    )