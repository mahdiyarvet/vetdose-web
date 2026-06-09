"""
VetDose Pro - Veterinary Drug Dosage Calculator
Based on Plumb's Veterinary Drug Handbook, 10th Edition

Backend: Flask
Author: Dr. Mahdiyar Ramzgooyan
"""

import json
import os
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Load drug database once at startup
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "drugs.json")

with open(DATA_PATH, encoding="utf-8") as f:
    DRUGS = json.load(f)

# Persian labels for species
SPECIES_FA = {
    "DOGS": "سگ",
    "CATS": "گربه",
    "DOGS & CATS": "سگ و گربه",
    "HORSES": "اسب",
    "CATTLE": "گاو",
    "RABBITS": "خرگوش",
    "BIRDS": "پرنده",
    "REPTILES": "خزنده",
    "FERRETS": "راسو (فرت)",
    "SWINE": "خوک",
    "PIGS": "خوک",
    "SHEEP": "گوسفند",
    "GOATS": "بز",
    "SMALL MAMMALS": "پستانداران کوچک",
    "PRIMATES": "پستانداران نخستی",
}

SPECIES_EMOJI = {
    "DOGS": "🐕", "CATS": "🐈", "DOGS & CATS": "🐕🐈", "HORSES": "🐎",
    "CATTLE": "🐄", "RABBITS": "🐇", "BIRDS": "🦜", "REPTILES": "🦎",
    "FERRETS": "🦦", "SWINE": "🐖", "PIGS": "🐖", "SHEEP": "🐑",
    "GOATS": "🐐", "SMALL MAMMALS": "🐹", "PRIMATES": "🐒",
}

# Build a lightweight index for autocomplete (name + class + species available)
DRUG_INDEX = []
for name, d in DRUGS.items():
    species = list(d.get("species", {}).keys())
    has_dose = any(d["species"][s]["doses"] for s in species)
    DRUG_INDEX.append({
        "name": name,
        "drug_class": d.get("drug_class"),
        "species": species,
        "has_dose": has_dose,
    })
DRUG_INDEX.sort(key=lambda x: x["name"].lower())


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/sw.js")
def service_worker():
    """Serve service worker from root for correct scope"""
    from flask import send_from_directory
    response = send_from_directory("static", "sw.js")
    response.headers["Content-Type"] = "application/javascript"
    response.headers["Service-Worker-Allowed"] = "/"
    return response


@app.route("/manifest.json")
def manifest():
    """Serve manifest from root"""
    from flask import send_from_directory
    return send_from_directory("static", "manifest.json",
                               mimetype="application/manifest+json")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/drugs")
def api_drugs():
    """Return the full drug index for autocomplete."""
    return jsonify(DRUG_INDEX)


@app.route("/api/drug/<path:name>")
def api_drug(name):
    """Return full data for a single drug, with Persian species labels attached."""
    d = DRUGS.get(name)
    if not d:
        return jsonify({"error": "not found"}), 404

    species_out = []
    for sp, sd in d.get("species", {}).items():
        species_out.append({
            "key": sp,
            "label_fa": SPECIES_FA.get(sp, sp.title()),
            "label_en": sp.title(),
            "emoji": SPECIES_EMOJI.get(sp, "🐾"),
            "text": sd["text"],
            "doses": sd["doses"],
            "available_routes": sd.get("available_routes", []),
        })

    return jsonify({
        "name": name,
        "drug_class": d.get("drug_class"),
        "general_note": d.get("general_note", ""),
        "species": species_out,
        "adverse": d.get("adverse"),
        "precautions": d.get("precautions"),
    })


@app.route("/api/calculate", methods=["POST"])
def api_calculate():
    """
    Calculate total dose and injection volume.

    Expects JSON:
      weight (kg), dose_low (mg/kg), dose_high (mg/kg),
      unit (mg|g|mcg|...), concentration (mg/ml, optional)
    """
    data = request.get_json(force=True)
    try:
        weight = float(data["weight"])
        dose_low = float(data["dose_low"])
        dose_high = float(data.get("dose_high", dose_low))
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "invalid_input"}), 400

    if weight <= 0 or weight > 2000:
        return jsonify({"error": "weight_out_of_range"}), 400

    unit = data.get("unit", "mg")

    # Convert dose to mg for volume math when unit is mass-based
    unit_to_mg = {"mg": 1.0, "g": 1000.0, "mcg": 0.001, "µg": 0.001}
    factor = unit_to_mg.get(unit, None)

    total_low = round(dose_low * weight, 3)
    total_high = round(dose_high * weight, 3)

    result = {
        "total_dose_low": total_low,
        "total_dose_high": total_high,
        "unit": unit,
        "volume_low": None,
        "volume_high": None,
    }

    conc = data.get("concentration")
    if conc:
        try:
            conc = float(conc)
        except (TypeError, ValueError):
            conc = None
    if conc and conc > 0 and factor is not None:
        total_low_mg = total_low * factor
        total_high_mg = total_high * factor
        result["volume_low"] = round(total_low_mg / conc, 3)
        result["volume_high"] = round(total_high_mg / conc, 3)

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
