import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
sys.stdout.reconfigure(encoding='utf-8')

from services.pharmacy_service import (
    detect_medicine_intent,
    extract_medicine_name,
    extract_quantity,
    extract_location_info,
    get_pharmacy_availability,
    build_order_summary,
    simulate_order_confirmation,
    requires_prescription,
    is_otc,
)

PASS = "[PASS]"
FAIL = "[FAIL]"

def test(name, condition):
    status = PASS if condition else FAIL
    print(f"  {status} {name}")
    return condition

results = []
print("\n=== Medicine Intent Detection ===")
results.append(test("Paracetamol tablet order detected", detect_medicine_intent("I need Paracetamol 650mg 10 tablets")))
results.append(test("Buy Cetirizine detected", detect_medicine_intent("Buy Cetirizine 10mg for me")))
results.append(test("Bare medicine+quantity detected", detect_medicine_intent("Paracetamol 650mg 10 tablets")))
results.append(test("Emergency not triggered as order", not detect_medicine_intent("chest pain emergency help")))
results.append(test("Plain question not triggered", not detect_medicine_intent("What are the side effects of aspirin?")))

print("\n=== Medicine Name Extraction ===")
results.append(test("Extract from 'I need X'", extract_medicine_name("I need Paracetamol 650mg 10 tablets") is not None))
results.append(test("Extract from 'Buy X'", extract_medicine_name("Buy Cetirizine 10mg") is not None))
results.append(test("Extract bare format", extract_medicine_name("Paracetamol 650mg 10 tablets") is not None))

print("\n=== Quantity Extraction ===")
results.append(test("'10 tablets' extracted", extract_quantity("I need Paracetamol 650mg 10 tablets") == "10 tablets"))
results.append(test("'2 strips' extracted", extract_quantity("Order Cetirizine 2 strips") == "2 strips"))
results.append(test("No quantity returns None", extract_quantity("I need Paracetamol") is None))

print("\n=== Location Parsing ===")
info = extract_location_info("560038")
results.append(test("Bangalore pincode parsed", info.get("pincode") == "560038" and info.get("city") == "Bangalore"))
info2 = extract_location_info("Mumbai")
results.append(test("City name parsed", info2.get("city") == "Mumbai"))
info3 = extract_location_info("near Indiranagar, Bangalore 560038")
results.append(test("Landmark + city + pincode parsed", info3.get("landmark") is not None and info3.get("city") == "Bangalore"))

print("\n=== OTC vs Prescription Check ===")
results.append(test("Paracetamol is OTC", is_otc("Paracetamol 650mg")))
results.append(test("Metformin requires Rx", requires_prescription("Metformin 500mg")))
results.append(test("Paracetamol does NOT require Rx", not requires_prescription("Paracetamol")))

print("\n=== Delivery Availability ===")
metro_platforms = get_pharmacy_availability({"pincode": "560038", "city": "Bangalore"})
tier2_platforms = get_pharmacy_availability({"city": "Jaipur"})
results.append(test("Bangalore gets all platforms incl. Blinkit/Zepto", len(metro_platforms) >= 5))
results.append(test("Tier-2 city gets fewer platforms", len(tier2_platforms) < len(metro_platforms)))

print("\n=== Order Summary Builder ===")
links = [{"name": "Apollo Pharmacy", "icon": "⚕️", "delivery_time": "30–60 min", "url": "#", "color": "red"}]
summary = build_order_summary("Paracetamol 650mg", "10 tablets", {"city": "Bangalore", "pincode": "560038"}, links)
results.append(test("Order summary contains medicine name", "Paracetamol 650mg" in summary))
results.append(test("Order summary contains quantity", "10 tablets" in summary))
results.append(test("Order summary requests confirm", "confirm" in summary.lower()))

print("\n=== Order Confirmation ===")
conf = simulate_order_confirmation("Paracetamol 650mg", "10 tablets", "Apollo Pharmacy")
results.append(test("Confirmation has order ID", "#ML" in conf or "Order Placed" in conf))
results.append(test("Confirmation mentions platform", "Apollo Pharmacy" in conf))

passed = sum(results)
total = len(results)
print(f"\n{'='*40}")
print(f"Results: {passed}/{total} passed {'🎉' if passed == total else '⚠️'}")
