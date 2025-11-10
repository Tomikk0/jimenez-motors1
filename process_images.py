img = img.convert("L").point(lambda x: 0 if x < 160 else 255, '1')
import pytesseract, re, sys, json, os
from PIL import Image

def clean_text(t):
    return re.sub(r'\s+', ' ', t.replace('\n', ' ')).strip()

def extract_value(pattern, text, cast=str, default=None):
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        try:
            return cast(match.group(1).replace(",", "").replace(".", "").strip())
        except:
            return default
    return default

def detect_bool(text, keywords):
    return any(k.lower() in text.lower() for k in keywords)

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
        "drivetype": 0,
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
            if detect_bool(text, ["Air ride", "airride", "air-ride"]): data["air_ride"] = 1
            if detect_bool(text, ["Nitro"]): data["nitro"] = 1
            if detect_bool(text, ["Sötétített", "üveg", "sotet"]): data["dark_glass"] = 1
            if detect_bool(text, ["Hajtás", "drivetype"]): data["drivetype"] = 1
            if detect_bool(text, ["Turbó", "Turbo"]): data["turbo"] = 1
            if detect_bool(text, ["Kompresszor"]): data["compressor"] = 1
            if detect_bool(text, ["Neon"]): data["neon"] = 1
            if detect_bool(text, ["Lámpa", "fény"]): data["colored_lights"] = 1

    # Ha semmit nem talált
    if not data["price"]:
        data["price"] = 0

    return data

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(json.dumps({"error": "No image paths given"}))
        sys.exit(1)
    result = process_images(args)
    print(json.dumps(result, ensure_ascii=False, indent=2))
