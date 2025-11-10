import pytesseract, re, sys, json, os, unicodedata
from PIL import Image


def strip_accents(value):
    return "".join(
        char for char in unicodedata.normalize("NFD", value)
        if unicodedata.category(char) != "Mn"
    )


def clean_text(text):
    return re.sub(r"\s+", " ", text.replace("\n", " ")).strip()


def extract_value(pattern, text, cast=str, default=None):
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        try:
            return cast(match.group(1).replace(",", "").replace(".", "").strip())
        except Exception:
            return default
    return default


def interpret_flag(raw_value):
    if raw_value is None:
        return None

    normalized = strip_accents(raw_value).lower().strip()

    truthy = {"van", "igen", "be", "on", "aktiv", "aktivalva", "aktivalt", "igen"}
    falsy = {"nincs", "nem", "ki", "off", "inaktiv", "inaktivalva", "inaktival"}

    if normalized in truthy:
        return 1
    if normalized in falsy:
        return 0

    digits = re.findall(r"\d+", normalized)
    if digits:
        return 1 if int(digits[0]) != 0 else 0

    return 1 if normalized else 0


def _variant_pattern(variant: str) -> str:
    normalized_variant = strip_accents(variant).lower()
    pattern_parts = []

    for ch in normalized_variant:
        if ch.isalnum():
            pattern_parts.append(re.escape(ch))
        elif ch.isspace() or ch == "-":
            pattern_parts.append(r"[\s\-]*")
        else:
            pattern_parts.append(re.escape(ch))

    return "".join(pattern_parts)


def extract_flag_field(text, variants):
    normalized_text = strip_accents(text).lower()

    for variant in variants:
        pattern = _variant_pattern(variant)
        value_pattern = (
            r"(van|nincs|igen|nem|be|ki|on|off|aktiv|inaktiv|[0-9]+(?:/[0-9]+)?)"
        )

        match = re.search(rf"{pattern}[\s:\-]*{value_pattern}", normalized_text)
        if match:
            return interpret_flag(match.group(1))

        # Fallback: keressük külön a VAN / NINCS kulcsszavakat a mintával kombinálva
        if re.search(rf"{pattern}[\s:\-]*van", normalized_text):
            return 1
        if re.search(rf"{pattern}[\s:\-]*nincs", normalized_text):
            return 0

    return None


def extract_text_field(text, variants):
    for variant in variants:
        pattern = rf"{variant}[:\- ]*([A-Za-z0-9ÁÉÍÓÖŐÚÜŰáéíóöőúüű\-\/ ]+)"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return clean_text(match.group(1))
    return None

def process_images(images):
    data = {
        "car_name": None,
        "price": None,
        "engine_condition": None,
        "seller": None,
        "phone": None,
        "tuning_points": None,
        "motor_level": None,
        "transmission_level": None,
        "wheel_level": None,
        "chip_level": None,
        "air_ride": 0,
        "nitro": 0,
        "dark_glass": 0,
        "drivetype": None,
        "turbo": 0,
        "compressor": 0,
        "neon": 0,
        "colored_lights": 0,
        "despawn_protect": 0,
        "steering_angle": None,
    }

    full_text = ""

    for idx, img_path in enumerate(images):
        if not os.path.exists(img_path):
            continue

        img = Image.open(img_path)
        width, height = img.size

        # Levágjuk az alsó 20%-ot, hogy ne olvassa az FPS sort
        crop_box = (0, 0, width, int(height * 0.8))
        img = img.crop(crop_box)
        img = img.convert("L").point(lambda x: 0 if x < 160 else 255, "1")

        text = pytesseract.image_to_string(img, lang="hun+eng")
        text = clean_text(text)
        full_text += "\n" + text

        # 1. kép = eladó autó (ár, név, eladó)
        if idx == 0:
            data["car_name"] = extract_value(r"Mercedes[- ]?Benz\s+([A-Za-z0-9\- ]+)", text) or "Mercedes-Benz SL63"
            data["price"] = extract_value(r"Ár[^0-9]*([0-9]{2,})", text, int)
            data["seller"] = extract_value(r"Eladó[:\- ]+([A-Za-z\s\.]+)", text)
            data["phone"] = extract_value(r"Tel(?:efonszám)?:\s*([0-9\+\s]+)", text)
            data["engine_condition"] = extract_value(r"Motor állapota[:\- ]*([0-9]+%)", text)

        # 2–3. kép = tuning adatok
        else:
            if data["tuning_points"] is None:
                data["tuning_points"] = extract_value(r"Tuning pont(?:ok)?[:\- ]*([0-9]+)", text, int)
            data["motor_level"] = extract_value(r"Motor szint[:\- ]*([0-9]+)", text, int)
            data["transmission_level"] = extract_value(r"Váltó szint[:\- ]*([0-9]+)", text, int)
            data["wheel_level"] = extract_value(r"Kerék szint[:\- ]*([0-9]+)", text, int)
            data["chip_level"] = extract_value(r"Chip szint[:\- ]*([0-9]+)", text, int)
            data["steering_angle"] = extract_value(r"Kormányzási szög[:\- ]*([0-9]+)", text, int)

            # Extrák
            flag_map = {
                "air_ride": ["Air Ride", "AirRide", "Air-Ride"],
                "nitro": ["Nitro"],
                "dark_glass": ["Sötétített üveg", "Sotetitett uveg", "Sotet uveg"],
                "turbo": ["Turbó", "Turbo"],
                "compressor": ["Kompresszor"],
                "neon": ["Neon"],
                "colored_lights": ["Színezett lámpa", "Szinezett lampa", "Lámpa szín", "Lampa szin"],
                "despawn_protect": ["Despawn védelem", "Despawn vedelem"],
            }

            for field, variants in flag_map.items():
                result = extract_flag_field(text, variants)
                if result is not None:
                    data[field] = result

            drivetype_value = extract_text_field(text, ["Hajtástípus", "Hajtás", "Drivetype"])
            if drivetype_value:
                data["drivetype"] = drivetype_value

    # Ha semmit nem talált
    if not data["price"]:
        data["price"] = 0

    for field in [
        "air_ride",
        "nitro",
        "dark_glass",
        "turbo",
        "compressor",
        "neon",
        "colored_lights",
        "despawn_protect",
    ]:
        data[field] = int(bool(data[field]))

    return data

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(json.dumps({"error": "No image paths given"}))
        sys.exit(1)
    result = process_images(args)
    print(json.dumps(result, ensure_ascii=False, indent=2))
