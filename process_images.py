import pytesseract, re, sys, json, os, unicodedata
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


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
        raw_value = match.group(1)
        if isinstance(raw_value, tuple):
            raw_value = next((part for part in raw_value if part), "")
        try:
            if cast in (int, float):
                number_match = re.search(r"-?\d+(?:[\.,]\d+)?", raw_value)
                if not number_match:
                    return default

                number_text = number_match.group(0).replace(",", ".")
                if cast is int:
                    return int(float(number_text))
                return float(number_text)

            cleaned_text = clean_text(raw_value)
            return cast(cleaned_text)
        except Exception:
            return default
    return default


def extract_first(patterns, text, cast=str, default=None):
    if isinstance(patterns, str):
        patterns = [patterns]

    for pattern in patterns:
        value = extract_value(pattern, text, cast=cast, default=None)
        if value is not None:
            return value

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

        if re.search(rf"(van|igen|be|on)[\s:\-]*{pattern}", normalized_text):
            return 1
        if re.search(rf"(nincs|nem|ki|off|inaktiv)[\s:\-]*{pattern}", normalized_text):
            return 0

    return None


def _normalized_with_index(text):
    normalized_chars = []
    index_map = []

    for idx, char in enumerate(text):
        decomposed = unicodedata.normalize("NFD", char)
        for piece in decomposed:
            if unicodedata.category(piece) == "Mn":
                continue
            normalized_chars.append(piece.lower())
            index_map.append(idx)

    return "".join(normalized_chars), index_map


def extract_text_field(text, variants):
    normalized_text, index_map = _normalized_with_index(text)

    for variant in variants:
        pattern = _variant_pattern(variant)
        match = re.search(
            rf"{pattern}[\s:\-=]*([a-z0-9\-\/() %+.,']{1,80})",
            normalized_text,
        )
        if match:
            start, end = match.start(1), match.end(1)
            if start >= len(index_map) or end == 0:
                continue

            orig_start = index_map[start]
            orig_end = index_map[end - 1] + 1
            return clean_text(text[orig_start:orig_end])

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
        "air_ride": None,
        "nitro": None,
        "dark_glass": None,
        "drivetype": None,
        "turbo": None,
        "compressor": None,
        "neon": None,
        "colored_lights": None,
        "despawn_protect": None,
        "steering_angle": None,
    }

    texts = []
    raw_texts = []

    flag_variants = {
        "air_ride": ["Air Ride", "AirRide", "Air-Ride"],
        "nitro": ["Nitro"],
        "dark_glass": ["Sötétített üveg", "Sotetitett uveg", "Sotet uveg", "Sotetitettuveg"],
        "turbo": ["Turbó", "Turbo"],
        "compressor": ["Kompresszor", "Kompressor"],
        "neon": ["Neon"],
        "colored_lights": [
            "Színezett lámpa",
            "Szinezett lampa",
            "Lámpa szín",
            "Lampa szin",
            "Szines lampa",
        ],
        "despawn_protect": ["Despawn védelem", "Despawn vedelem", "Despawn ved."],
    }

    for idx, img_path in enumerate(images):
        if not os.path.exists(img_path):
            continue

        img = Image.open(img_path)
        width, height = img.size

        crop_box = (0, 0, width, int(height * 0.8))
        img = img.crop(crop_box)
        img = img.convert("L")
        img = ImageOps.autocontrast(img)
        img = ImageEnhance.Contrast(img).enhance(1.8)
        img = img.filter(ImageFilter.SHARPEN)

        raw_text = pytesseract.image_to_string(
            img,
            lang="hun+eng",
            config="--oem 3 --psm 6",
        )
        text = clean_text(raw_text)
        texts.append(text)
        raw_texts.append(raw_text)

        # 1. kép = eladó autó (ár, név, eladó)
        if idx == 0:
            data["car_name"] = extract_first(
                [
                    r"Mercedes[- ]?Benz\s+([A-Za-z0-9\- ]+)",
                    r"Merce(?:des)?[- ]?Benz\s+([A-Za-z0-9\- ]+)",
                ],
                text,
            ) or "Mercedes-Benz SL63"
            data["price"] = extract_first(
                [
                    r"Ár[^0-9]*([0-9][0-9\s\.]*)",
                    r"Ar[^0-9]*([0-9][0-9\s\.]*)",
                    r"Ára[^0-9]*([0-9][0-9\s\.]*)",
                    r"Ara[^0-9]*([0-9][0-9\s\.]*)",
                ],
                text,
                int,
            )
            data["seller"] = extract_first(
                [
                    r"Eladó[:\- ]+([A-Za-z\s\.]+)",
                    r"Elado[:\- ]+([A-Za-z\s\.]+)",
                ],
                text,
            )
            data["phone"] = extract_first(
                [
                    r"Tel(?:efonszám)?[:\- ]*([0-9\+\s]+)",
                    r"Tel(?:efonszam)?[:\- ]*([0-9\+\s]+)",
                ],
                text,
            )
            data["engine_condition"] = extract_first(
                [
                    r"Motor állapota[:\- ]*([0-9]+%)",
                    r"Motor allapota[:\- ]*([0-9]+%)",
                    r"Motor állapot[:\- ]*([0-9]+%)",
                    r"Motor allapot[:\- ]*([0-9]+%)",
                ],
                text,
            )

        # 2–3. kép = tuning adatok
        else:
            if data["tuning_points"] is None:
                data["tuning_points"] = extract_first(
                    [
                        r"Tuning pont(?:ok)?[:\- ]*([0-9]+)",
                        r"Tuningpont(?:ok)?[:\- ]*([0-9]+)",
                    ],
                    text,
                    int,
                )
            data["motor_level"] = extract_first(
                [
                    r"Motor szint[:\- ]*([0-9]+)",
                    r"Motor tuning[:\- ]*([0-9]+)",
                ],
                text,
                int,
            )
            data["transmission_level"] = extract_first(
                [
                    r"Váltó szint[:\- ]*([0-9]+)",
                    r"Valto szint[:\- ]*([0-9]+)",
                ],
                text,
                int,
            )
            data["wheel_level"] = extract_first(
                [
                    r"Kerék szint[:\- ]*([0-9]+)",
                    r"Kerek szint[:\- ]*([0-9]+)",
                ],
                text,
                int,
            )
            data["chip_level"] = extract_first(
                [
                    r"Chip szint[:\- ]*([0-9]+)",
                    r"Chip tuning[:\- ]*([0-9]+)",
                ],
                text,
                int,
            )
            data["steering_angle"] = extract_first(
                [
                    r"Kormányzási szög[:\- ]*([0-9]+)",
                    r"Kormanyzasi szog[:\- ]*([0-9]+)",
                ],
                text,
                int,
            )

            # Extrák
            for field, variants in flag_variants.items():
                result = extract_flag_field(text, variants)
                if result is not None:
                    data[field] = result

            drivetype_value = extract_text_field(
                text,
                [
                    "Hajtástípus",
                    "Hajtastipus",
                    "Hajtás",
                    "Hajtas",
                    "Drivetype",
                ],
            )
            if drivetype_value:
                data["drivetype"] = drivetype_value

    combined_text = " ".join(texts)
    raw_combined_text = "\n".join(raw_texts)

    if data["price"] in (None, 0):
        fallback_price = extract_first(
            [
                r"Ár[^0-9]*([0-9][0-9\s\.]*)",
                r"Ar[^0-9]*([0-9][0-9\s\.]*)",
                r"Ára[^0-9]*([0-9][0-9\s\.]*)",
                r"Ara[^0-9]*([0-9][0-9\s\.]*)",
            ],
            combined_text,
            int,
        )
        if fallback_price is not None:
            data["price"] = fallback_price

    if not data["engine_condition"]:
        fallback_engine = extract_first(
            [
                r"Motor állapota[:\- ]*([0-9]+%)",
                r"Motor allapota[:\- ]*([0-9]+%)",
                r"Motor állapot[:\- ]*([0-9]+%)",
                r"Motor allapot[:\- ]*([0-9]+%)",
            ],
            combined_text,
        )
        if fallback_engine:
            data["engine_condition"] = fallback_engine

    numeric_fallbacks = {
        "tuning_points": [
            r"Tuning pont(?:ok)?[:\- ]*([0-9]+)",
            r"Tuningpont(?:ok)?[:\- ]*([0-9]+)",
            r"TP[:\- ]*([0-9]+)",
        ],
        "motor_level": [
            r"Motor szint[:\- ]*([0-9]+)",
            r"Motor tuning[:\- ]*([0-9]+)",
            r"Motorszint[:\- ]*([0-9]+)",
        ],
        "transmission_level": [
            r"Váltó szint[:\- ]*([0-9]+)",
            r"Valto szint[:\- ]*([0-9]+)",
            r"Valtoszint[:\- ]*([0-9]+)",
        ],
        "wheel_level": [
            r"Kerék szint[:\- ]*([0-9]+)",
            r"Kerek szint[:\- ]*([0-9]+)",
            r"Kerekszint[:\- ]*([0-9]+)",
        ],
        "chip_level": [
            r"Chip szint[:\- ]*([0-9]+)",
            r"Chip tuning[:\- ]*([0-9]+)",
            r"Chipszint[:\- ]*([0-9]+)",
        ],
        "steering_angle": [r"Kormányzási szög[:\- ]*([0-9]+)", r"Kormanyzasi szog[:\- ]*([0-9]+)"],
    }

    for field, patterns in numeric_fallbacks.items():
        if data[field] is None:
            value = extract_first(patterns, combined_text, int)
            if value is not None:
                data[field] = value

    textual_numeric_variants = {
        "tuning_points": ["Tuning pont", "Tuningpont", "Tuning", "TP"],
        "motor_level": ["Motor szint", "Motor tuning", "Motor", "Motorszint"],
        "transmission_level": [
            "Váltó szint",
            "Valto szint",
            "Váltó",
            "Valto",
            "Valtoszint",
        ],
        "wheel_level": ["Kerék szint", "Kerek szint", "Kerék", "Kerek", "Kerekszint"],
        "chip_level": ["Chip szint", "Chip tuning", "Chip", "Chipszint"],
        "steering_angle": [
            "Kormányzási szög",
            "Kormanyzasi szog",
            "Kormányzási",
            "Kormanyzasi",
        ],
    }

    for field, variants in textual_numeric_variants.items():
        if data[field] is None:
            snippet = extract_text_field(combined_text, variants)
            if snippet:
                number_match = re.search(r"-?\d+(?:[\.,]\d+)?", snippet)
                if number_match:
                    data[field] = int(float(number_match.group(0).replace(",", ".")))

    def extract_numeric_near_keyword(text, variants, window=40):
        normalized_text, index_map = _normalized_with_index(text)

        for variant in variants:
            pattern = _variant_pattern(variant)

            for match in re.finditer(pattern, normalized_text):
                # Search after the keyword
                start = match.end()
                after_slice = normalized_text[start : min(len(normalized_text), start + window)]
                number_match = re.search(r"-?\d+", after_slice)
                if number_match:
                    number_start = start + number_match.start()
                    number_end = start + number_match.end()

                    if number_start < len(index_map) and number_end - 1 < len(index_map):
                        orig_start = index_map[number_start]
                        orig_end = index_map[number_end - 1] + 1
                        raw_fragment = text[orig_start:orig_end]
                        digits = re.search(r"-?\d+", raw_fragment)
                        if digits:
                            return int(digits.group(0))

                # Search before the keyword (use last occurrence)
                end = match.start()
                before_slice = normalized_text[max(0, end - window) : end]
                number_match = re.search(r"-?\d+(?:(?:[\./]\d+))?$", before_slice)
                if number_match:
                    number_start = max(0, end - window) + number_match.start()
                    number_end = max(0, end - window) + number_match.end()

                    if number_start < len(index_map) and number_end - 1 < len(index_map):
                        orig_start = index_map[number_start]
                        orig_end = index_map[number_end - 1] + 1
                        raw_fragment = text[orig_start:orig_end]
                        digits = re.search(r"-?\d+", raw_fragment)
                        if digits:
                            return int(digits.group(0))

        return None

    keyword_numeric_variants = {
        "tuning_points": ["Tuning pont", "Tuningpont", "Tuning", "TP"],
        "motor_level": ["Motor szint", "Motor tuning", "Motor", "Motorszint"],
        "transmission_level": ["Váltó szint", "Valto szint", "Váltó", "Valto", "Valtoszint"],
        "wheel_level": ["Kerék szint", "Kerek szint", "Kerék", "Kerek", "Kerekszint"],
        "chip_level": ["Chip szint", "Chip tuning", "Chip", "Chipszint"],
        "steering_angle": ["Kormányzási szög", "Kormanyzasi szog", "Kormányzási", "Kormanyzasi"],
    }

    for field, variants in keyword_numeric_variants.items():
        if data[field] is None:
            value = extract_numeric_near_keyword(raw_combined_text, variants)
            if value is not None:
                data[field] = value

    for field in ["seller", "phone"]:
        if not data[field]:
            variants = [
                "Eladó" if field == "seller" else "Telefon",
                "Elado" if field == "seller" else "Telefonszam",
                "Tulajdonos" if field == "seller" else "Tel",
            ]

            for variant in variants:
                fallback = extract_text_field(combined_text, [variant])
                if not fallback:
                    continue

                if field == "phone" and not re.search(r"\d", fallback):
                    continue

                data[field] = fallback
                break

    if not data["car_name"] and combined_text:
        name = extract_first(
            [
                r"Mercedes[- ]?Benz\s+([A-Za-z0-9\- ]+)",
                r"Merce(?:des)?[- ]?Benz\s+([A-Za-z0-9\- ]+)",
            ],
            combined_text,
        )
        if name:
            data["car_name"] = name

    if not data["drivetype"]:
        drivetype_value = extract_text_field(
            combined_text,
            ["Hajtástípus", "Hajtastipus", "Hajtás", "Hajtas", "Drivetype"],
        )
        if drivetype_value:
            data["drivetype"] = drivetype_value

    for field, variants in flag_variants.items():
        if data[field] is None:
            result = extract_flag_field(combined_text, variants)
            if result is not None:
                data[field] = result

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

    numeric_defaults = [
        "tuning_points",
        "motor_level",
        "transmission_level",
        "wheel_level",
        "chip_level",
        "steering_angle",
    ]

    for field in numeric_defaults:
        if data[field] is None:
            data[field] = 0

    return data

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(json.dumps({"error": "No image paths given"}))
        sys.exit(1)
    result = process_images(args)
    print(json.dumps(result, ensure_ascii=False, indent=2))
