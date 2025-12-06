from flask import Blueprint, request, jsonify, session, url_for
from flask import current_app
from login.login import validate_credentials
from buyer.cart import fetch_cart_items_for_buyer
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename
import os
import mysql.connector
import math
import json

load_dotenv()

api_bp = Blueprint('api', __name__)

DB_CONFIG = {
    "host": os.getenv("AIVEN_HOST"),
    "port": int(os.getenv("AIVEN_PORT", 19441)),
    "user": os.getenv("AIVEN_USER"),
    "password": os.getenv("AIVEN_PASSWORD"),
    "database": os.getenv("AIVEN_DATABASE"),
    "use_pure": True,
}

VOLUMETRIC_FACTOR = 5000
SHIPPING_RATE_PER_UNIT_WEIGHT = 50


def calculate_shipping_fee(weight, length, width, height):
    volumetric_weight = (length * width * height) / VOLUMETRIC_FACTOR
    return max(weight, volumetric_weight) * SHIPPING_RATE_PER_UNIT_WEIGHT


def _variation_id_generator(cursor):
    cursor.execute("SELECT MAX(VariationID) FROM product_variation")
    latest = cursor.fetchone()
    latest_id = latest[0] if latest else None
    if latest_id and len(latest_id) > 2 and latest_id[2:].isdigit():
        next_index = int(latest_id[2:]) + 1
    else:
        next_index = 1000
    return f"VT{next_index}"


def _next_product_id(cursor):
    cursor.execute("SELECT MAX(ProductID) FROM product")
    latest = cursor.fetchone()
    latest_value = latest[0] if latest else None
    if latest_value and len(latest_value) > 2 and latest_value[2:].isdigit():
        return f"PD{int(latest_value[2:]) + 1}"
    return "PD1000"


def _product_belongs_to_seller(cursor, product_id, seller_id):
    cursor.execute("SELECT ProductID FROM product WHERE ProductID = %s AND SellerID = %s", (product_id, seller_id))
    return cursor.fetchone() is not None


def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)


def _normalize_registration_data(source):
    def _value(*keys):
        for key in keys:
            value = source.get(key)
            if value:
                return value.strip()
        return None

    return {
        'name': _value('name', 'Name'),
        'email': _value('email', 'Email'),
        'phone_number': _value('phoneNumber', 'Phone_Number', 'phone', 'Phone'),
        'username': _value('username', 'Username'),
        'password': _value('password', 'Password'),
    }


def _username_exists(username):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT 1 FROM buyer WHERE Username = %s", (username,))
        if cursor.fetchone():
            return True
        cursor.execute("SELECT 1 FROM seller WHERE Username = %s", (username,))
        return cursor.fetchone() is not None
    finally:
        cursor.close()
        conn.close()


def _next_user_id(cursor, table_name, prefix):
    cursor.execute(f"SELECT MAX({table_name}ID) FROM {table_name}")
    latest = cursor.fetchone()
    latest_value = latest[0] if latest else None
    if latest_value:
        numeric_part = int(str(latest_value)[2:])
        return f"{prefix}{numeric_part + 1}"
    return f"{prefix}1000"


def _create_user(table_name, prefix, payload):
    hashed_password = generate_password_hash(payload['password'])
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user_id = _next_user_id(cursor, table_name, prefix)
        cursor.execute(
            f"INSERT INTO {table_name} ({table_name}ID, Name, Email, Phone_Number, Username, Password) VALUES (%s, %s, %s, %s, %s, %s)",
            (
                user_id,
                payload['name'],
                payload['email'],
                payload['phone_number'],
                payload['username'],
                hashed_password,
            ),
        )
        conn.commit()
        return user_id
    except mysql.connector.IntegrityError:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def _generate_payment_option_id(cursor):
    cursor.execute("SELECT MAX(Payment_OptionsID) FROM buyer_payment_options")
    latest = cursor.fetchone()
    latest_value = latest[0] if latest else None
    if latest_value and len(latest_value) > 2 and latest_value[2:].isdigit():
        next_index = int(latest_value[2:]) + 1
    else:
        next_index = 1000
    return f"PO{next_index}"


ORDER_STATUS_KEY_TO_DB_STATUS = {
    'to_pay': 'waiting for payment',
    'to_ship': 'pending',
    'shipping': 'shipping',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
}


def _format_buyer_address(row):
    if not row:
        return ''
    parts = []
    for key in ('Full_Name', 'Phone_Number', 'Street', 'Municipality'):
        value = row.get(key)
        if value:
            parts.append(value)
    province = row.get('Province')
    zip_code = row.get('Zip_Code')
    region_parts = ' '.join(part for part in (province, zip_code) if part)
    if region_parts:
        parts.append(region_parts)
    return ', '.join(parts)


def _format_payment_option(row):
    method = row.get('Payment_Method')
    if not method:
        return ''
    account = (row.get('Account_Number') or '').strip()
    if account and account.lower() != 'none':
        return f"{method}, {account}"
    return method


def _build_buyer_order_payload(row):
    return {
        'OrderID': row.get('OrderID'),
        'Product_Name': row.get('Product_Name'),
        'ImageFileName': row.get('ImageFileName'),
        'Shipping_Fee': float(row.get('Shipping_Fee') or 0),
        'Unit': row.get('Unit'),
        'Quantity': row.get('Quantity'),
        'Price': float(row.get('Price') or 0),
        'Total_Amount': float(row.get('Total_Amount') or 0),
        'Order_Date': row.get('Order_Date'),
        'Shipping_Date': row.get('Shipping_Date'),
        'Buyer_Address': _format_buyer_address(row),
        'Payment_Option': _format_payment_option(row),
        'Order_Status': row.get('Order_Status'),
    }


def _next_address_id(cursor):
    cursor.execute("SELECT MAX(AddressID) FROM buyer_addresses")
    latest = cursor.fetchone()
    latest_value = latest[0] if latest else None
    if latest_value and len(latest_value) > 2 and latest_value[2:].isdigit():
        return f"BA{int(latest_value[2:]) + 1:04d}"
    return "BA1000"


def _build_address_payload(row):
    return {
        'addressId': row.get('AddressID'),
        'fullName': row.get('Full_Name'),
        'phoneNumber': row.get('Phone_Number'),
        'street': row.get('Street'),
        'municipality': row.get('Municipality'),
        'province': row.get('Province'),
        'region': row.get('Region'),
        'zipCode': row.get('Zip_Code'),
        'latitude': row.get('Latitude') if row.get('Latitude') is not None else 0.0,
        'longitude': row.get('Longitude') if row.get('Longitude') is not None else 0.0,
        'isDefault': bool(row.get('IsDefaultInt') or row.get('IsDefault')),
    }



REGISTRATION_CONFIG = {
    'buyer': {'table': 'buyer', 'prefix': 'BY', 'user_type': 'buyer'},
    'seller': {'table': 'seller', 'prefix': 'SL', 'user_type': 'seller'},
}


@api_bp.route('/api/register/<role>', methods=['POST'])
def api_register_role(role):
    normalized_role = role.lower()
    config = REGISTRATION_CONFIG.get(normalized_role)
    if not config:
        return jsonify({'success': False, 'message': 'Unknown role.'}), 400

    payload_source = request.get_json(silent=True)
    if payload_source is None:
        payload_source = request.form
    registration_data = _normalize_registration_data(payload_source)
    required_fields = ['name', 'email', 'username', 'password']
    missing_fields = [field for field in required_fields if not registration_data.get(field)]
    if missing_fields:
        return (
            jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing_fields)}."}),
            400,
        )

    if _username_exists(registration_data['username']):
        return jsonify({'success': False, 'message': 'Username already exists.'}), 409

    try:
        user_id = _create_user(config['table'], config['prefix'], registration_data)
        return jsonify({'success': True, 'userId': user_id, 'userType': config['user_type']}), 201
    except mysql.connector.IntegrityError:
        return jsonify({'success': False, 'message': 'Username already exists.'}), 409
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/buyer_orders')
def api_buyer_orders():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    status_key = request.args.get('status', 'to_pay')
    db_status = ORDER_STATUS_KEY_TO_DB_STATUS.get(status_key, 'waiting for payment')
    sort = request.args.get('sort', 'recent')
    order_direction = 'ASC' if sort == 'old' else 'DESC'
    query = f"""
        SELECT bo.OrderID, bo.Quantity, bo.Total_Amount, bo.Order_Date, bo.Shipping_Date, bo.Order_Status,
               p.Product_Name, p.ImageFileName, p.Shipping_Fee,
               pv.Unit, pv.Price,
               ba.Full_Name, ba.Phone_Number, ba.Street, ba.Municipality, ba.Province, ba.Zip_Code,
               bp.Payment_Method, bp.Account_Number
        FROM buyer_order bo
        LEFT JOIN product p ON p.ProductID = bo.ProductID
        LEFT JOIN product_variation pv ON pv.VariationID = bo.VariationID
        LEFT JOIN buyer_addresses ba ON ba.AddressID = bo.AddressID
        LEFT JOIN buyer_payment_options bp ON bp.Payment_OptionsID = bo.Payment_OptionsID
        WHERE bo.BuyerID = %s AND bo.Order_Status = %s
        ORDER BY bo.Order_Date {order_direction}
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (user_id, db_status))
            rows = cursor.fetchall()
            orders = [_build_buyer_order_payload(row) for row in rows]
            return jsonify({'success': True, 'orders': orders})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/buyer_orders/<order_id>/pay', methods=['POST'])
def api_pay_buyer_order(order_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE buyer_order
                SET Order_Status = 'pending', Shipping_Date = 'waiting for shipment'
                WHERE BuyerID = %s AND OrderID = %s
                """,
                (user_id, order_id),
            )
            if cursor.rowcount == 0:
                return jsonify({'success': False, 'message': 'Order not found.'}), 404
            cursor.execute(
                """
                UPDATE seller_order
                SET Order_Status = 'pending', Shipping_Date = 'waiting for shipment'
                WHERE OrderID = %s
                """,
                (order_id,),
            )
            conn.commit()
        return jsonify({'success': True})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/buyer_orders/<order_id>/cancel', methods=['POST'])
def api_cancel_buyer_order(order_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT VariationID, Quantity FROM buyer_order WHERE OrderID = %s AND BuyerID = %s",
                (order_id, user_id),
            )
            record = cursor.fetchone()
            if not record:
                return jsonify({'success': False, 'message': 'Order not found.'}), 404
            variation_id, ordered_quantity = record
            ordered_quantity = ordered_quantity or 0
            cursor.execute(
                """
                UPDATE buyer_order
                SET Order_Status = 'cancelled'
                WHERE BuyerID = %s AND OrderID = %s
                """,
                (user_id, order_id),
            )
            cursor.execute(
                """
                UPDATE seller_order
                SET Order_Status = 'cancelled'
                WHERE OrderID = %s
                """,
                (order_id,),
            )
            cursor.execute(
                "SELECT Quantity FROM product_variation WHERE VariationID = %s",
                (variation_id,),
            )
            current_stock = cursor.fetchone()
            if current_stock:
                new_quantity = (current_stock[0] or 0) + ordered_quantity
                cursor.execute(
                    "UPDATE product_variation SET Quantity = %s WHERE VariationID = %s",
                    (new_quantity, variation_id),
                )
            conn.commit()
        return jsonify({'success': True})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/buyer_orders/<order_id>/received', methods=['POST'])
def api_mark_buyer_order_received(order_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE buyer_order
                SET Order_Status = 'delivered'
                WHERE BuyerID = %s AND OrderID = %s
                """,
                (user_id, order_id),
            )
            if cursor.rowcount == 0:
                return jsonify({'success': False, 'message': 'Order not found.'}), 404
            cursor.execute(
                """
                UPDATE seller_order
                SET Order_Status = 'delivered'
                WHERE OrderID = %s
                """,
                (order_id,),
            )
            conn.commit()
        return jsonify({'success': True})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

@api_bp.route('/api/login', methods=['POST'])
def api_login():
    payload = request.get_json(force=True)
    username = payload.get('username')
    password = payload.get('password')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required.'}), 400

    credentials = validate_credentials(username, password)

    if credentials:
        user_id, user_type = credentials
        session['user_id'] = user_id
        session['user_type'] = user_type
        if user_type == 'seller':
            session['SellerID'] = user_id
        else:
            session.pop('SellerID', None)

        if user_type == 'buyer':
            session['BuyerID'] = user_id
        else:
            session.pop('BuyerID', None)
        return jsonify({
            'success': True,
            'user': {
                'userId': user_id,
                'userType': user_type,
                'username': username,
            },
        })

    return jsonify({'success': False, 'message': 'Invalid username or password.'}), 401

@api_bp.route('/api/logout', methods=['POST'])
def api_logout():
    session_keys = ['user_id', 'user_type', 'BuyerID', 'SellerID']
    for key in session_keys:
        session.pop(key, None)
    return jsonify({'success': True})

@api_bp.route('/api/status')
def api_status():
    user = None
    user_id = session.get('user_id')
    user_type = session.get('user_type')
    if user_id:
        user = {'userId': user_id, 'userType': user_type}
    return jsonify({'user': user})

@api_bp.route('/api/cart')
def api_cart():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    cart_items = fetch_cart_items_for_buyer(user_id)
    payload = []

    for item in cart_items:
        payload.append({
            'cartId': item[0],
            'productId': item[1],
            'variationId': item[2],
            'productName': item[3],
            'image': url_for('static', filename=f"images/products/{item[4]}", _external=True),
            'quantity': item[5],
            'unit': item[6],
            'price': float(item[7]),
        })

    return jsonify({'success': True, 'items': payload})


@api_bp.route('/api/categories')
def api_categories():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT CategoryID, Category_Name FROM product_category")
            rows = cursor.fetchall()
            categories = [{'categoryId': row[0], 'name': row[1]} for row in rows]
            return jsonify({'success': True, 'categories': categories})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/default-address')
def api_default_address():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': True, 'address': None})
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT AddressID, Municipality, Province, Latitude, Longitude FROM buyer_addresses WHERE BuyerID = %s AND isDefault = 1 LIMIT 1",
                (user_id,),
            )
            address = cursor.fetchone()
            return jsonify({'success': True, 'address': address})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/buyer_addresses')
def api_buyer_addresses():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT *, CAST(IsDefault AS UNSIGNED) AS IsDefaultInt FROM buyer_addresses WHERE BuyerID = %s ORDER BY IsDefault DESC, AddressID ASC",
                (user_id,),
            )
            rows = cursor.fetchall()
            addresses = [_build_address_payload(row) for row in rows]
            return jsonify({'success': True, 'addresses': addresses})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/buyer_addresses', methods=['POST'])
def api_create_buyer_address():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    payload = request.get_json(force=True) or {}
    required_fields = ['fullName', 'phoneNumber', 'street', 'municipality', 'province', 'region', 'zipCode']
    missing = [field for field in required_fields if not payload.get(field)]
    if missing:
        return (
            jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}."}),
            400,
        )
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM buyer_addresses WHERE BuyerID = %s", (user_id,))
            has_addresses = cursor.fetchone()[0]
            new_id = _next_address_id(cursor)
            latitude = float(payload.get('latitude') or 0)
            longitude = float(payload.get('longitude') or 0)
            is_default = 1 if has_addresses == 0 else 0
            cursor.execute(
                """
                INSERT INTO buyer_addresses
                (AddressID, BuyerID, Full_Name, Phone_Number, Street, Municipality, Province, Region, Zip_Code, Latitude, Longitude, IsDefault)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    new_id,
                    user_id,
                    payload['fullName'].strip(),
                    payload['phoneNumber'].strip(),
                    payload['street'].strip(),
                    payload['municipality'].strip(),
                    payload['province'].strip(),
                    payload['region'].strip(),
                    payload['zipCode'].strip(),
                    latitude,
                    longitude,
                    is_default,
                ),
            )
            conn.commit()
        return jsonify({'success': True})
    except ValueError:
        return jsonify({'success': False, 'message': 'Latitude and longitude must be numbers.'}), 400
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/buyer_addresses/<address_id>', methods=['PATCH'])
def api_update_buyer_address(address_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    payload = request.get_json(force=True) or {}
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE buyer_addresses
                SET Full_Name = %s,
                    Phone_Number = %s,
                    Street = %s,
                    Municipality = %s,
                    Province = %s,
                    Region = %s,
                    Zip_Code = %s,
                    Latitude = %s,
                    Longitude = %s
                WHERE AddressID = %s AND BuyerID = %s
                """,
                (
                    payload.get('fullName', '').strip(),
                    payload.get('phoneNumber', '').strip(),
                    payload.get('street', '').strip(),
                    payload.get('municipality', '').strip(),
                    payload.get('province', '').strip(),
                    payload.get('region', '').strip(),
                    payload.get('zipCode', '').strip(),
                    float(payload.get('latitude') or 0),
                    float(payload.get('longitude') or 0),
                    address_id,
                    user_id,
                ),
            )
            if cursor.rowcount == 0:
                return jsonify({'success': False, 'message': 'Address not found.'}), 404
            conn.commit()
        return jsonify({'success': True})
    except ValueError:
        return jsonify({'success': False, 'message': 'Latitude and longitude must be numbers.'}), 400
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/buyer_addresses/<address_id>', methods=['DELETE'])
def api_delete_buyer_address(address_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM buyer_addresses WHERE AddressID = %s AND BuyerID = %s", (address_id, user_id))
            if cursor.rowcount == 0:
                return jsonify({'success': False, 'message': 'Address not found.'}), 404
            conn.commit()
        return jsonify({'success': True})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/buyer_addresses/<address_id>/default', methods=['POST'])
def api_set_default_buyer_address(address_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE buyer_addresses SET IsDefault = 0 WHERE BuyerID = %s", (user_id,))
            cursor.execute(
                "UPDATE buyer_addresses SET IsDefault = 1 WHERE AddressID = %s AND BuyerID = %s",
                (address_id, user_id),
            )
            if cursor.rowcount == 0:
                return jsonify({'success': False, 'message': 'Address not found.'}), 404
            conn.commit()
        return jsonify({'success': True})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/products')
def api_products():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    category_filter = request.args.get('category', 'all')
    range_km = 50.0
    try:
        range_km = float(request.args.get('range_km', 50))
    except ValueError:
        pass

    search_term = request.args.get('search', '').strip().lower()

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT Latitude, Longitude FROM buyer_addresses WHERE BuyerID = %s AND isDefault = 1", (user_id,))
            buyer = cursor.fetchone()
            buyer_lat = float(buyer['Latitude']) if buyer and buyer.get('Latitude') else None
            buyer_lon = float(buyer['Longitude']) if buyer and buyer.get('Longitude') else None

            category_clause = ''
            params = []
            if category_filter and category_filter.lower() != 'all':
                cursor.execute("SELECT CategoryID FROM product_category WHERE Category_Name = %s", (category_filter,))
                category_row = cursor.fetchone()
                if not category_row:
                    return jsonify({'success': False, 'message': 'Category not found.'}), 400
                category_clause = 'WHERE p.CategoryID = %s'
                params.append(category_row['CategoryID'])

            query = f"""
                SELECT p.ProductID, p.Product_Name, MIN(pv.Price) AS MinPrice, MAX(pv.Price) AS MaxPrice,
                       p.ImageFileName, sa.Municipality, sa.Province, sa.Latitude AS SellerLat, sa.Longitude AS SellerLon
                FROM product p
                JOIN product_variation pv ON p.ProductID = pv.ProductID
                JOIN seller_addresses sa ON p.AddressID = sa.AddressID
                {category_clause}
                GROUP BY p.ProductID, p.Product_Name, p.ImageFileName, sa.Municipality, sa.Province, sa.Latitude, sa.Longitude
            """
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()

            products = []
            for row in rows:
                distance = None
                if buyer_lat is not None and buyer_lon is not None and row.get('SellerLat') and row.get('SellerLon'):
                    distance = round(haversine(buyer_lat, buyer_lon, float(row['SellerLat']), float(row['SellerLon'])), 2)
                if distance is None or distance <= range_km:
                    product_name = row['Product_Name'] or ''
                    if search_term and search_term not in product_name.lower():
                        continue
                    products.append({
                        'productId': row['ProductID'],
                        'productName': row['Product_Name'],
                        'minPrice': float(row['MinPrice'] or 0),
                        'maxPrice': float(row['MaxPrice'] or 0),
                        'image': url_for('static', filename=f"images/products/{row['ImageFileName']}", _external=True),
                        'municipality': row['Municipality'],
                        'province': row['Province'],
                        'distance': distance,
                    })

            return jsonify({'success': True, 'products': products})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/products/<string:product_id>')
def api_product_detail(product_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            query = """
                SELECT p.ProductID, p.Product_Name, p.CategoryID, p.ImageFileName,
                       pc.Category_Name, pv.VariationID, pv.Unit, pv.Price, pv.Quantity,
                       p.Weight, p.Packaging_Length, p.Packaging_Width, p.Packaging_Height,
                       p.Shipping_Fee, p.AddressID,
                       sa.Street, sa.Municipality, sa.Province, sa.Region, sa.Zip_Code
                FROM product p
                JOIN product_variation pv ON p.ProductID = pv.ProductID
                LEFT JOIN product_category pc ON p.CategoryID = pc.CategoryID
                LEFT JOIN seller_addresses sa ON p.AddressID = sa.AddressID
                WHERE p.ProductID = %s
            """
            cursor.execute(query, (product_id,))
            rows = cursor.fetchall()

            if not rows:
                return jsonify({'success': False, 'message': 'Product not found.'}), 404

            first_row = rows[0]
            image_filename = first_row.get('ImageFileName')
            product_payload = {
                'productId': first_row.get('ProductID'),
                'productName': first_row.get('Product_Name'),
                'categoryId': first_row.get('CategoryID'),
                'categoryName': first_row.get('Category_Name'),
                'weight': first_row.get('Weight'),
                'packagingLength': first_row.get('Packaging_Length'),
                'packagingWidth': first_row.get('Packaging_Width'),
                'packagingHeight': first_row.get('Packaging_Height'),
                'shippingFee': float(first_row.get('Shipping_Fee') or 0),
                'addressId': first_row.get('AddressID'),
                'address': None,
                'image': url_for('static', filename=f"images/products/{image_filename}", _external=True) if image_filename else None,
                'variations': [],
            }

            if first_row.get('AddressID') and first_row.get('Street'):
                product_payload['address'] = {
                    'addressId': first_row.get('AddressID'),
                    'street': first_row.get('Street'),
                    'municipality': first_row.get('Municipality'),
                    'province': first_row.get('Province'),
                    'region': first_row.get('Region'),
                    'zipCode': first_row.get('Zip_Code'),
                }

            for row in rows:
                variation = {
                    'variationId': row.get('VariationID'),
                    'unit': row.get('Unit'),
                    'price': float(row.get('Price') or 0),
                    'quantity': row.get('Quantity'),
                }
                product_payload['variations'].append(variation)

            return jsonify({'success': True, 'product': product_payload})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/payment-options')
def api_payment_options():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT Payment_Method, Account_Number FROM buyer_payment_options WHERE BuyerID = %s AND Status = 'active'",
                (user_id,),
            )
            rows = cursor.fetchall()
            options = {row[0]: row[1] for row in rows}

            cursor.execute("SELECT MethodID, Payment_Method FROM methods_of_payment")
            methods = [{'id': row[0], 'name': row[1]} for row in cursor.fetchall()]
            return jsonify({'success': True, 'options': options, 'paymentMethods': methods})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/payment-options', methods=['POST'])
def api_save_payment_options():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    payload = request.get_json(force=True) or {}
    options_payload = payload.get('options') or {}
    normalized = {}
    for method, account in options_payload.items():
        if method != 'Cash on Delivery' and (account is None or not str(account).strip()):
            return jsonify({'success': False, 'message': f'Account number required for {method}.'}), 400
        normalized[method] = 'None' if method == 'Cash on Delivery' else str(account).strip()

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE buyer_payment_options SET Status = 'old' WHERE BuyerID = %s AND Status = 'active'",
                (user_id,),
            )
            conn.commit()
            for method, account in normalized.items():
                payment_options_id = _generate_payment_option_id(cursor)
                cursor.execute(
                    "INSERT INTO buyer_payment_options (Payment_OptionsID, BuyerID, Payment_Method, Account_Number, Status) VALUES (%s, %s, %s, %s, 'active')",
                    (payment_options_id, user_id, method, account),
                )
            conn.commit()
        return jsonify({'success': True})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


def _seller_products_query(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT p.ProductID, p.Product_Name, p.ImageFilename,
               IFNULL((SELECT SUM(Total_Amount) FROM seller_order so WHERE so.ProductID = p.ProductID AND so.SellerID = %s), 0) AS revenue,
               IFNULL((SELECT SUM(Quantity) FROM product_variation pv WHERE pv.ProductID = p.ProductID), 0) AS total_quantity
        FROM product p
        WHERE p.SellerID = %s
    """
    cursor.execute(query, (seller_id, seller_id))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def _build_product_payload(row):
    image_filename = row.get('ImageFilename')
    image_url = None
    if image_filename:
        image_url = url_for('static', filename=f"images/products/{image_filename}", _external=True)
    status = 'Live' if (row.get('revenue') or 0) > 0 else 'Restock'
    return {
        'productId': row.get('ProductID'),
        'productName': row.get('Product_Name'),
        'image': image_url,
        'revenue': float(row.get('revenue') or 0),
        'stock': int(row.get('total_quantity') or 0),
        'status': status,
    }


@api_bp.route('/api/seller/products')
def api_seller_products():
    seller_id = session.get('user_id')
    if not seller_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    try:
        rows = _seller_products_query(seller_id)
        products = [_build_product_payload(row) for row in rows]
        return jsonify({'success': True, 'products': products})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/seller/products', methods=['POST'])
def api_create_seller_product():
    seller_id = session.get('user_id')
    if not seller_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    form = request.form
    product_name = (form.get('Product_Name') or '').strip()
    category_id = (form.get('Category') or '').strip()
    if not product_name or not category_id:
        return jsonify({'success': False, 'message': 'Product name and category are required.'}), 400

    try:
        weight = float(form.get('Weight') or 0)
        packaging_length = float(form.get('Packaging_Length') or 0)
        packaging_width = float(form.get('Packaging_Width') or 0)
        packaging_height = float(form.get('Packaging_Height') or 0)
    except ValueError:
        return jsonify({'success': False, 'message': 'Valid weight and packaging dimensions are required.'}), 400

    if weight <= 0 or packaging_length <= 0 or packaging_width <= 0 or packaging_height <= 0:
        return jsonify({'success': False, 'message': 'Weight and packaging dimensions must be greater than zero.'}), 400

    variations_raw = form.get('variations') or '[]'
    try:
        variations_payload = json.loads(variations_raw)
    except json.JSONDecodeError:
        return jsonify({'success': False, 'message': 'Invalid variations payload.'}), 400

    if not isinstance(variations_payload, list) or len(variations_payload) == 0:
        return jsonify({'success': False, 'message': 'At least one variation is required.'}), 400

    normalized_variations = []
    for idx, variation in enumerate(variations_payload, 1):
        if not isinstance(variation, dict):
            return jsonify({'success': False, 'message': f'Variation #{idx} is invalid.'}), 400
        try:
            price_value = float(variation.get('price'))
            quantity_value = int(variation.get('quantity'))
        except (TypeError, ValueError):
            return jsonify({'success': False, 'message': f'Valid price and quantity are required for variation #{idx}.'}), 400
        if price_value < 0 or quantity_value < 0:
            return jsonify({'success': False, 'message': f'Variation #{idx} must have positive price and quantity.'}), 400
        normalized_variations.append({
            'unit': (variation.get('unit') or '').strip(),
            'price': price_value,
            'quantity': quantity_value,
        })

    image = request.files.get('Image')
    image_filename = None
    image_path = None
    upload_folder = current_app.config.get('UPLOAD_FOLDER') or os.path.join(os.getcwd(), 'static', 'images', 'products')

    if image and image.filename:
        os.makedirs(upload_folder, exist_ok=True)
        image_filename = secure_filename(image.filename)
        image_path = os.path.join(upload_folder, image_filename)
        image.save(image_path)

    address_id = (form.get('AddressID') or '').strip() or None
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if address_id:
                cursor.execute("SELECT SellerID FROM seller_addresses WHERE AddressID = %s", (address_id,))
                row = cursor.fetchone()
                if not row or row[0] != seller_id:
                    return jsonify({'success': False, 'message': 'Selected address not found.'}), 400
            else:
                cursor.execute(
                    "SELECT AddressID FROM seller_addresses WHERE SellerID = %s AND IsDefault = 1 LIMIT 1",
                    (seller_id,),
                )
                default_row = cursor.fetchone()
                if default_row:
                    address_id = default_row[0]

            product_id = _next_product_id(cursor)
            shipping_fee = calculate_shipping_fee(weight, packaging_length, packaging_width, packaging_height)
            cursor.execute(
                """
                INSERT INTO product
                (ProductID, SellerID, Product_Name, Weight, Packaging_Length, Packaging_Width, Packaging_Height, CategoryID, ImageFileName, Shipping_Fee, AddressID)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    product_id,
                    seller_id,
                    product_name,
                    weight,
                    packaging_length,
                    packaging_width,
                    packaging_height,
                    category_id,
                    image_filename,
                    shipping_fee,
                    address_id,
                ),
            )

            for variation in normalized_variations:
                variation_id = _variation_id_generator(cursor)
                cursor.execute(
                    "INSERT INTO product_variation (VariationID, ProductID, Unit, Price, Quantity) VALUES (%s, %s, %s, %s, %s)",
                    (
                        variation_id,
                        product_id,
                        variation['unit'] or None,
                        variation['price'],
                        variation['quantity'],
                    ),
                )
            conn.commit()
        return jsonify({'success': True, 'productId': product_id})
    except mysql.connector.Error as err:
        if image_path and os.path.exists(image_path):
            try:
                os.remove(image_path)
            except OSError:
                pass
        return jsonify({'success': False, 'message': str(err)}), 500

@api_bp.route('/api/seller/products/<product_id>', methods=['DELETE'])
def api_delete_seller_product(product_id):
        seller_id = session.get('user_id')
        if not seller_id:
            return jsonify({'success': False, 'message': 'Authentication required.'}), 401
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT ImageFilename FROM product WHERE ProductID = %s AND SellerID = %s", (product_id, seller_id))
                row = cursor.fetchone()
                if not row:
                    return jsonify({'success': False, 'message': 'Product not found.'}), 404
                image_filename = row[0]
                cursor.execute("DELETE FROM product_variation WHERE ProductID = %s", (product_id,))
                cursor.execute("DELETE FROM product WHERE ProductID = %s", (product_id,))
                conn.commit()
            if image_filename:
                image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], image_filename)
                if os.path.exists(image_path):
                    os.remove(image_path)
            return jsonify({'success': True})
        except mysql.connector.Error as err:
            return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/seller/products/<product_id>', methods=['PATCH'])
def api_update_seller_product(product_id):
        seller_id = session.get('user_id')
        if not seller_id:
            return jsonify({'success': False, 'message': 'Authentication required.'}), 401
        payload = request.get_json(force=True) or {}
        name = (payload.get('name') or '').strip()
        if not name:
            return jsonify({'success': False, 'message': 'Product name is required.'}), 400

        try:
            weight = float(payload.get('weight'))
            packaging_length = float(payload.get('packagingLength'))
            packaging_width = float(payload.get('packagingWidth'))
            packaging_height = float(payload.get('packagingHeight'))
        except (TypeError, ValueError):
            return jsonify({'success': False, 'message': 'Valid weight and packaging dimensions are required.'}), 400

        shipping_fee = calculate_shipping_fee(weight, packaging_length, packaging_width, packaging_height)

        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    UPDATE product
                    SET Product_Name = %s,
                        Weight = %s,
                        Packaging_Length = %s,
                        Packaging_Width = %s,
                        Packaging_Height = %s,
                        Shipping_Fee = %s
                    WHERE ProductID = %s AND SellerID = %s
                    """,
                    (name, weight, packaging_length, packaging_width, packaging_height, shipping_fee, product_id, seller_id),
                )
                if cursor.rowcount == 0:
                    return jsonify({'success': False, 'message': 'Product not found.'}), 404
                conn.commit()
            return jsonify({'success': True, 'shippingFee': float(shipping_fee)})
        except mysql.connector.Error as err:
            return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/seller/products/<product_id>/variations', methods=['POST'])
def api_add_product_variation(product_id):
        seller_id = session.get('user_id')
        if not seller_id:
            return jsonify({'success': False, 'message': 'Authentication required.'}), 401
        payload = request.get_json(force=True) or {}
        unit = (payload.get('unit') or '').strip()
        price = payload.get('price')
        quantity = payload.get('quantity')
        if not unit or price is None or quantity is None:
            return jsonify({'success': False, 'message': 'Unit, price, and quantity are required.'}), 400
        try:
            price_value = float(price)
            quantity_value = int(quantity)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid price or quantity.'}), 400
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                if not _product_belongs_to_seller(cursor, product_id, seller_id):
                    return jsonify({'success': False, 'message': 'Product not found.'}), 404
                variation_id = _variation_id_generator(cursor)
                cursor.execute(
                    "INSERT INTO product_variation (VariationID, ProductID, Unit, Price, Quantity) VALUES (%s, %s, %s, %s, %s)",
                    (variation_id, product_id, unit, price_value, quantity_value),
                )
                conn.commit()
            return jsonify({'success': True, 'variationId': variation_id})
        except mysql.connector.Error as err:
            return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/seller/products/<product_id>/variations/<variation_id>', methods=['PATCH'])
def api_update_product_variation(product_id, variation_id):
        seller_id = session.get('user_id')
        if not seller_id:
            return jsonify({'success': False, 'message': 'Authentication required.'}), 401
        payload = request.get_json(force=True) or {}
        unit = (payload.get('unit') or '').strip()
        price = payload.get('price')
        quantity = payload.get('quantity')
        if not unit or price is None or quantity is None:
            return jsonify({'success': False, 'message': 'Unit, price, and quantity are required.'}), 400
        try:
            price_value = float(price)
            quantity_value = int(quantity)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid price or quantity.'}), 400
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                if not _product_belongs_to_seller(cursor, product_id, seller_id):
                    return jsonify({'success': False, 'message': 'Product not found.'}), 404
                cursor.execute(
                    "UPDATE product_variation SET Unit = %s, Price = %s, Quantity = %s WHERE VariationID = %s AND ProductID = %s",
                    (unit, price_value, quantity_value, variation_id, product_id),
                )
                if cursor.rowcount == 0:
                    return jsonify({'success': False, 'message': 'Variation not found.'}), 404
                conn.commit()
            return jsonify({'success': True})
        except mysql.connector.Error as err:
            return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/seller/products/<product_id>/variations/<variation_id>', methods=['DELETE'])
def api_delete_product_variation(product_id, variation_id):
        seller_id = session.get('user_id')
        if not seller_id:
            return jsonify({'success': False, 'message': 'Authentication required.'}), 401
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                if not _product_belongs_to_seller(cursor, product_id, seller_id):
                    return jsonify({'success': False, 'message': 'Product not found.'}), 404
                cursor.execute(
                    "DELETE FROM product_variation WHERE VariationID = %s AND ProductID = %s",
                    (variation_id, product_id),
                )
                if cursor.rowcount == 0:
                    return jsonify({'success': False, 'message': 'Variation not found.'}), 404
                conn.commit()
            return jsonify({'success': True})
        except mysql.connector.Error as err:
            return jsonify({'success': False, 'message': str(err)}), 500


@api_bp.route('/api/seller/products/<product_id>/address/<address_id>', methods=['POST'])
def api_update_product_address(product_id, address_id):
        seller_id = session.get('user_id')
        if not seller_id:
            return jsonify({'success': False, 'message': 'Authentication required.'}), 401
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT SellerID FROM seller_addresses WHERE AddressID = %s", (address_id,))
                row = cursor.fetchone()
                if not row or row[0] != seller_id:
                    return jsonify({'success': False, 'message': 'Address not found.'}), 404
                cursor.execute(
                    "UPDATE product SET AddressID = %s WHERE ProductID = %s AND SellerID = %s",
                    (address_id, product_id, seller_id),
                )
                if cursor.rowcount == 0:
                    return jsonify({'success': False, 'message': 'Product not found.'}), 404
                conn.commit()
            return jsonify({'success': True})
        except mysql.connector.Error as err:
            return jsonify({'success': False, 'message': str(err)}), 500
