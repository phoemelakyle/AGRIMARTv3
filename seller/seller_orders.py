from flask import Blueprint, render_template, request, redirect, session, url_for, jsonify
import mysql.connector
from datetime import datetime, date, timedelta
from dotenv import load_dotenv
import os

load_dotenv()

seller_orders_app = Blueprint('seller_orders', __name__)

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

ORDER_STATUS_MAP = {
    'unpaid': 'waiting for payment',
    'to_ship': 'pending',
    'shipping': 'shipping',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
}

def get_orders_by_status(user_id, status_key, sort='recent'):
    if status_key not in ORDER_STATUS_MAP:
        return []
    order_status = ORDER_STATUS_MAP[status_key]
    order_details = []
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            order_by = 'ASC' if sort == 'old' else 'DESC'
            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Payment_OptionsID, Shipping_Date, AddressID
            FROM seller_order
            WHERE Order_Status = %s AND SellerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (order_status, user_id))
            orders = cursor.fetchall()
            for order in orders:
                product_id = order['ProductID']
                variation_id = order['VariationID']
                address_id = order.get('AddressID')
                payment_optionsid = order.get('Payment_OptionsID')

                cursor.execute(
                    """
                    SELECT Product_Name, ImageFileName, Shipping_Fee
                    FROM product
                    WHERE ProductID = %s
                    """,
                    (product_id,),
                )
                product_info = cursor.fetchone()

                cursor.execute(
                    """
                    SELECT Unit, Price
                    FROM product_variation
                    WHERE VariationID = %s
                    """,
                    (variation_id,),
                )
                variation_info = cursor.fetchone()

                buyer_address = ''
                if address_id:
                    cursor.execute(
                        """
                        SELECT Full_Name, Phone_Number, Street, Municipality, Province, Zip_Code
                        FROM buyer_addresses
                        WHERE AddressID = %s
                        """,
                        (address_id,),
                    )
                    addr = cursor.fetchone()
                    if addr:
                        buyer_address = f"{addr['Full_Name']}, {addr['Phone_Number']}, {addr['Street']}, {addr['Municipality']}, {addr['Province']} {addr['Zip_Code']}"

                payment_opt = ''
                if payment_optionsid:
                    cursor.execute(
                        """
                        SELECT Payment_Method, Account_Number
                        FROM buyer_payment_options
                        WHERE Payment_OptionsID = %s
                        """,
                        (payment_optionsid,),
                    )
                    payment = cursor.fetchone()
                    if payment:
                        payment_opt = f"{payment['Payment_Method']}, {payment['Account_Number']}"

                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Quantity': order['Quantity'],
                    'OrderID': order['OrderID'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'Order_Date': order['Order_Date'],
                    'Shipping_Date': order.get('Shipping_Date'),
                    'Buyer_Address': buyer_address,
                    'Payment_Option': payment_opt,
                    'Order_Status': status_key,
                }
                order_details.append(order_detail)
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    return order_details

def get_unpaid_orders_data(user_id, sort='recent'):
    return get_orders_by_status(user_id, 'unpaid', sort)

def get_to_ship_orders_data(user_id, sort='recent'):
    return get_orders_by_status(user_id, 'to_ship', sort)

def get_shipping_orders_data(user_id, sort='recent'):
    return get_orders_by_status(user_id, 'shipping', sort)

def get_delivered_orders_data(user_id, sort='recent'):
    return get_orders_by_status(user_id, 'delivered', sort)

def get_cancelled_orders_data(user_id, sort='recent'):
    return get_orders_by_status(user_id, 'cancelled', sort)

def ship_order(order_id):
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            current_date = datetime.now().strftime('%Y-%m-%d')
            update_query = """
            UPDATE buyer_order
            SET Order_Status = 'shipping', Shipping_Date = %s
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (current_date, order_id))
            update_query = """
            UPDATE seller_order
            SET Order_Status = 'shipping', Shipping_Date = %s
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (current_date, order_id))
            connection.commit()
        return True
    except mysql.connector.Error as err:
        print(f"Error shipping order: {err}")
        return False

def cancel_order(order_id):
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()
            update_query = """
            UPDATE buyer_order
            SET Order_Status = 'cancelled'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            update_query = """
            UPDATE seller_order
            SET Order_Status = 'cancelled'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            connection.commit()

            cursor.execute("SELECT VariationID, Quantity FROM seller_order WHERE OrderID = %s", (order_id,))
            variation_info = cursor.fetchone()
            if variation_info:
                variation_id, sl_quantity = variation_info
                cursor.execute("SELECT Quantity FROM product_variation WHERE VariationID = %s", (variation_id,))
                pv_quantity = cursor.fetchone()[0]
                new_quantity = max(pv_quantity + sl_quantity, 0)
                cursor.execute("UPDATE product_variation SET Quantity = %s WHERE VariationID = %s", (new_quantity, variation_id))
                connection.commit()
        return True
    except mysql.connector.Error as err:
        print(f"Error cancelling order: {err}")
        return False

def get_sales_summary(user_id, days):
    days = max(1, min(days, 90))
    start_date = date.today() - timedelta(days=days - 1)
    end_date = date.today() + timedelta(days=1)
    totals = {}
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT DATE(Order_Date) AS order_date,
                       COALESCE(SUM(Total_Amount), 0) AS total_amount
                FROM seller_order
                WHERE SellerID = %s
                  AND Order_Status != 'cancelled'
                  AND Order_Date >= %s
                  AND Order_Date < %s
                GROUP BY DATE(Order_Date)
                ORDER BY DATE(Order_Date) ASC
                """,
                (user_id, start_date, end_date),
            )
            rows = cursor.fetchall()
            for row in rows:
                order_date = row['order_date']
                if isinstance(order_date, datetime):
                    order_date = order_date.date()
                totals[order_date.isoformat()] = float(row['total_amount'] or 0)
    except mysql.connector.Error as err:
        print(f"Error fetching sales summary: {err}")
        return None
    result = []
    current_date = start_date
    for _ in range(days):
        iso_date = current_date.isoformat()
        result.append({'date': iso_date, 'total': totals.get(iso_date, 0)})
        current_date += timedelta(days=1)
    return result


def sample_sales_by_days(days):
    weekly_values = [5, 12, 7, 14, 19, 16, 28]
    monthly_values = [5, 12, 7, 14, 19, 16, 28, 24, 20, 15, 12, 14, 19, 21, 18, 17, 20, 22, 25, 26, 23, 19, 18, 16, 12, 15, 14, 13, 15, 18]
    reference = weekly_values if days <= 7 else monthly_values
    result = []
    today = date.today()
    for idx in range(days):
        value = reference[idx % len(reference)] if idx < len(reference) else reference[-1]
        target_date = today - timedelta(days=days - 1 - idx)
        result.append({'date': target_date.isoformat(), 'total': float(value)})
    return result

@seller_orders_app.route('/unpaid_orders', methods=['POST','GET'])
def unpaid_orders():
    user_id = session.get('user_id')
    if not user_id:
        return redirect('/login') 
    sort = request.args.get('sort', 'recent')
    order_details = get_unpaid_orders_data(user_id, sort)

    order_type = 'unpaid'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/to_ship_orders', methods=['POST','GET'])
def to_ship_orders():
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    sort = request.args.get('sort', 'recent')
    order_details = get_to_ship_orders_data(user_id, sort)

    order_type = 'to_ship'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/shipping_orders', methods=['POST','GET'])
def shipping_orders():
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    sort = request.args.get('sort', 'recent')
    order_details = get_shipping_orders_data(user_id, sort)
    order_type = 'shipping'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/delivered_orders', methods=['POST','GET'])
def delivered_orders():
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    sort = request.args.get('sort', 'recent')
    order_details = get_delivered_orders_data(user_id, sort)
    order_type = 'delivered'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/cancelled_orders', methods=['POST','GET'])
def cancelled_orders():
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    sort = request.args.get('sort', 'recent')
    order_details = get_cancelled_orders_data(user_id, sort)
    order_type = 'cancelled'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type)

@seller_orders_app.route('/ship_now/<order_id>', methods=['POST', 'GET'])
def ship_now(order_id):
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    
    ship_order(order_id)
    order_details = get_to_ship_orders_data(user_id)
    order_type = 'to_ship'
    return render_template('seller_orders.html', order_details=order_details, order_type=order_type, refresh_page=True)

@seller_orders_app.route('/cancel_unpaid_order/<order_id>', methods=['POST', 'GET'])
def cancel_unpaid_order(order_id):
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    cancel_order(order_id)
    return redirect(url_for('seller_orders.unpaid_orders'))

@seller_orders_app.route('/cancel_to_ship_order/<order_id>', methods=['POST', 'GET'])
def cancel_to_ship_order(order_id):
    user_id = session.get("user_id")
    if not user_id:
        return redirect('/login') 
    cancel_order(order_id)
    return redirect(url_for('seller_orders.to_ship_orders'))


@seller_orders_app.route('/api/seller_orders', methods=['GET'])
def api_seller_orders():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    status = request.args.get('status', 'unpaid')
    sort = request.args.get('sort', 'recent')
    order_details = get_orders_by_status(user_id, status, sort)
    return jsonify({'success': True, 'orders': order_details})


@seller_orders_app.route('/api/seller_orders/<order_id>/ship', methods=['POST'])
def api_ship_order(order_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    success = ship_order(order_id)
    if success:
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Unable to ship order.'}), 500


@seller_orders_app.route('/api/seller_orders/<order_id>/cancel', methods=['POST'])
def api_cancel_order(order_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401
    success = cancel_order(order_id)
    if success:
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Unable to cancel order.'}), 500


@seller_orders_app.route('/api/seller_sales', methods=['GET'])
def api_seller_sales():
    user_id = session.get('user_id')
    user_type = session.get('user_type')
    days_param = request.args.get('days', '7')
    try:
        requested_days = int(days_param)
    except ValueError:
        requested_days = 7
    days = max(1, min(requested_days, 90))

    force_sample = user_type == 'seller'
    data = None
    sample_used = force_sample
    if not force_sample and user_id:
        data = get_sales_summary(user_id, days)
        if data is None:
            sample_used = True
        elif not any(entry['total'] > 0 for entry in data):
            sample_used = True

    if sample_used:
        data = sample_sales_by_days(days)

    if data is None:
        return jsonify({'success': False, 'message': 'Unable to load sales data.'}), 500

    return jsonify({'success': True, 'days': days, 'data': data, 'sample': sample_used})