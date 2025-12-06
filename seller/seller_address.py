from flask import Blueprint, render_template, request, redirect, flash, session, url_for, jsonify
import mysql.connector
import os

seller_address_app = Blueprint('seller_address', __name__)

db_config = {
    "host": os.getenv("AIVEN_HOST"),
    "port": int(os.getenv("AIVEN_PORT", 19441)), 
    "user": os.getenv("AIVEN_USER"),
    "password": os.getenv("AIVEN_PASSWORD"),
    "database": os.getenv("AIVEN_DATABASE"),
    "use_pure": True                                  
}

def get_db_connection():
    return mysql.connector.connect(**db_config)


def fetch_seller_addresses(seller_id):
    if not seller_id:
        return []
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT *, CAST(IsDefault AS UNSIGNED) AS IsDefaultInt
            FROM seller_addresses
            WHERE SellerID = %s
            ORDER BY IsDefault DESC, AddressID ASC
            """,
            (seller_id,),
        )
        rows = cursor.fetchall()
    return rows


def generate_new_address_id(cursor):
    cursor.execute("SELECT MAX(AddressID) FROM seller_addresses")
    last_id = cursor.fetchone()[0]
    if last_id and len(last_id) > 2 and last_id[2:].isdigit():
        return f"SA{int(last_id[2:]) + 1:04d}"
    return "SA1000"


def upsert_seller_address(seller_id, payload):
    if not seller_id:
        return None
    address_id = payload.get('address_id')
    full_name = payload['full_name']
    phone_number = payload['phone_number']
    street = payload['street']
    municipality = payload['municipality']
    province = payload['province']
    region = payload['region']
    zip_code = payload['zip_code']
    latitude = float(payload.get('latitude') or 0.0)
    longitude = float(payload.get('longitude') or 0.0)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        if address_id:
            cursor.execute(
                """
                UPDATE seller_addresses
                SET Full_Name=%s,
                    Phone_Number=%s,
                    Street=%s,
                    Municipality=%s,
                    Province=%s,
                    Region=%s,
                    Zip_Code=%s,
                    Latitude=%s,
                    Longitude=%s
                WHERE AddressID=%s AND SellerID=%s
                """,
                (
                    full_name,
                    phone_number,
                    street,
                    municipality,
                    province,
                    region,
                    zip_code,
                    latitude,
                    longitude,
                    address_id,
                    seller_id,
                ),
            )
        else:
            cursor.execute("SELECT COUNT(*) FROM seller_addresses WHERE SellerID=%s", (seller_id,))
            has_addresses = cursor.fetchone()[0]
            address_id = generate_new_address_id(cursor)
            insert_query = """
                INSERT INTO seller_addresses
                (AddressID, SellerID, Full_Name, Phone_Number, Street, Municipality, Province, Region, Zip_Code, Latitude, Longitude, IsDefault)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(
                insert_query,
                (
                    address_id,
                    seller_id,
                    full_name,
                    phone_number,
                    street,
                    municipality,
                    province,
                    region,
                    zip_code,
                    latitude,
                    longitude,
                    1 if has_addresses == 0 else 0,
                ),
            )
        conn.commit()
    return address_id


def delete_seller_address_record(seller_id, address_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM product WHERE AddressID = %s", (address_id,))
        if cursor.fetchone()[0] > 0:
            return False
        cursor.execute(
            "DELETE FROM seller_addresses WHERE AddressID = %s AND SellerID = %s",
            (address_id, seller_id),
        )
        conn.commit()
    return True


def set_default_seller_address_record(seller_id, address_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE seller_addresses SET IsDefault=0 WHERE SellerID=%s", (seller_id,))
        cursor.execute(
            "UPDATE seller_addresses SET IsDefault=1 WHERE AddressID=%s AND SellerID=%s",
            (address_id, seller_id),
        )
        conn.commit()

@seller_address_app.route('/seller_address')
def seller_address():
    seller_id = session.get('SellerID')
    if not seller_id:
        return redirect('/login') 
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if key:
        key = key.strip()

    addresses = []
    if seller_id:
        addresses = fetch_seller_addresses(seller_id)

    return render_template(
        "seller_address.html",
        google_maps_api_key=key,
        addresses=addresses
    )

@seller_address_app.route('/save_seller_address', methods=['POST'])
def save_seller_address():
    # Get seller ID from session 
    seller_id = session.get('SellerID')
    if not seller_id:
        return redirect('/login') 

    payload = {
        'address_id': request.form.get('address_id') or None,
        'full_name': request.form['full_name'],
        'phone_number': request.form['phone_number'],
        'street': request.form['street'],
        'municipality': request.form['municipality'],
        'province': request.form['province'],
        'region': request.form['region'],
        'zip_code': request.form['zip_code'],
        'latitude': request.form.get('latitude'),
        'longitude': request.form.get('longitude'),
    }
    upsert_seller_address(seller_id, payload)
    flash("Address saved successfully!")
    return redirect(url_for('seller_address.seller_address'))

@seller_address_app.route('/delete_seller_address/<address_id>')
def delete_seller_address(address_id):
    seller_id = session.get('SellerID')
    if not seller_id:
        return redirect('/login') 

    deleted = delete_seller_address_record(seller_id, address_id)
    if not deleted:
        return redirect(url_for('seller_address.seller_address', delete_error=1))
    flash("Address deleted successfully!")
    return redirect(url_for('seller_address.seller_address'))


@seller_address_app.route('/set_default_seller_address', methods=['POST'])
def set_default_address():
    seller_id = session.get('SellerID')
    if not seller_id:
        return redirect('/login') 

    data = request.get_json()
    address_id = data.get("address_id")
    if not address_id:
        return {"success": False, "error": "No address ID provided"}, 400

    try:
        set_default_seller_address_record(seller_id, address_id)
    except Exception as e:
        print(e)
        return {"success": False, "error": str(e)}, 500

    return {"success": True}


@seller_address_app.route('/api/seller_addresses', methods=['GET'])
def api_get_seller_addresses():
    seller_id = session.get('SellerID')
    if not seller_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    addresses = fetch_seller_addresses(seller_id)
    return jsonify({'success': True, 'addresses': addresses})


@seller_address_app.route('/api/seller_addresses', methods=['POST'])
def api_save_seller_address():
    seller_id = session.get('SellerID')
    if not seller_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({'success': False, 'message': 'Invalid payload.'}), 400
    required = ['full_name', 'phone_number', 'street', 'municipality', 'province', 'region', 'zip_code']
    missing = [field for field in required if not payload.get(field)]
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}."}), 400
    upsert_seller_address(seller_id, payload)
    return jsonify({'success': True})


@seller_address_app.route('/api/seller_addresses/<string:address_id>', methods=['DELETE'])
def api_delete_seller_address(address_id):
    seller_id = session.get('SellerID')
    if not seller_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    deleted = delete_seller_address_record(seller_id, address_id)
    if not deleted:
        return jsonify({'success': False, 'message': 'Address cannot be deleted because it is in use.'}), 400
    return jsonify({'success': True})


@seller_address_app.route('/api/seller_addresses/<string:address_id>/default', methods=['POST'])
def api_set_default_seller_address(address_id):
    seller_id = session.get('SellerID')
    if not seller_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    try:
        set_default_seller_address_record(seller_id, address_id)
        return jsonify({'success': True})
    except Exception as err:
        return jsonify({'success': False, 'message': str(err)}), 500
