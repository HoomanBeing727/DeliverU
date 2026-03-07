import base64
from io import BytesIO

from PIL import Image
from pyzbar.pyzbar import decode


def decode_qr_from_base64(image_b64: str) -> str | None:
    """Decode a QR code from a base64-encoded image string.

    Returns the decoded text, or None if no QR code was found.
    """
    try:
        # Strip data URL prefix if present (e.g., "data:image/png;base64,")
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        image_data = base64.b64decode(image_b64)
        image = Image.open(BytesIO(image_data))
        results = decode(image)
        if results:
            return results[0].data.decode("utf-8")
        return None
    except Exception:
        return None
