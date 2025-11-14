from flask import Blueprint, render_template, request, redirect, flash, session, url_for, jsonify
import mysql.connector
import json
from decimal import Decimal
from datetime import datetime
import os

cart_app = Blueprint('cart', __name__)

db_config = {
    "host": os.getenv("AIVEN_HOST"),
    "port": int(os.getenv("AIVEN_PORT", 19441)),  # default port if not set
    "user": os.getenv("AIVEN_USER"),
    "password": os.getenv("AIVEN_PASSWORD"),
    "database": os.getenv("AIVEN_DATABASE"),
    "use_pure": True                            
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

def fetch_cart_items_for_buyer(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT cart.CartID, cart.ProductID, cart.VariationID, product.Product_Name, product.ImageFilename, cart.Cart_Quantity, product_variation.Unit, product_variation.Price
        FROM cart
        JOIN product ON cart.ProductID = product.ProductID
        JOIN product_variation ON cart.VariationID = product_variation.VariationID
        WHERE cart.BuyerID = %s;

    """
    cursor.execute(query, (user_id,))
    cart_items = cursor.fetchall()
    cursor.close()
    conn.close()

    return cart_items

def fetch_selected_items_details(selected_items):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = f"""
        SELECT cart.ProductID, cart.VariationID, product.Product_Name, product_Variation.Unit, product_Variation.Price, cart.Cart_Quantity, product.ImageFilename, product.Shipping_Fee, product.SellerID
        FROM cart
        JOIN product ON cart.ProductID = product.ProductID
        JOIN product_variation ON cart.VariationID = product_variation.VariationID
        WHERE CONCAT(cart.ProductID, '_', cart.VariationID) IN ({','.join(['%s'] * len(selected_items))});
    """
    cursor.execute(query, selected_items)
    selected_items_details = cursor.fetchall()

    total_payment = 0
    for item in selected_items_details:
        product_total = (item[5] * item[7]) + (item[4] * item[5]) + 10
        total_payment += product_total

    payment_options = fetch_payment_options(selected_items_details)

    cursor.close()
    conn.close()

    return selected_items_details, payment_options, total_payment

def fetch_payment_options(selected_items_details):
    conn = get_db_connection()
    cursor = conn.cursor()

    payment_query = """
        SELECT po.sellerid, po.payment_optionsid, p.product_name, pv.variationid, po.payment_method, po.account_number, pv.unit
        FROM payment_options po
        JOIN product p ON po.sellerid = p.SellerID
        JOIN product_variation pv ON p.ProductID = pv.ProductID
        WHERE po.sellerid IN ({})
    """.format(', '.join(['%s'] * len(set(item[-1] for item in selected_items_details))))

    cursor.execute(payment_query, tuple(set(item[-1] for item in selected_items_details)))
    payment_options = cursor.fetchall()

    cursor.close()
    conn.close()

    combined_options = {}
    for item in selected_items_details:
        variation_id = item[1]

        if variation_id not in combined_options:
            combined_options[variation_id] = {'product_names': set(), 'options': []}

        if item[2] not in combined_options[variation_id]['product_names']:
            combined_options[variation_id]['product_names'].add(item[2])

        for option in payment_options:
            if option[0] == item[-1] and option[3] == variation_id:  
                combined_options[variation_id]['options'].append({
                    'payment_optionsid': option[1],  
                    'product_name': option[2],
                    'variation_id': option[3],
                    'unit': option[6],
                    'payment_method': option[4],
                    'account_number': option[5]
                })

    return combined_options

def generate_order_id_for_buyer():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT MAX(OrderID) FROM buyer_order")
    latest_order_id = cursor.fetchone()[0]

    if latest_order_id is not None:
        numeric_part = int(latest_order_id[2:])
        new_numeric_part = numeric_part + 1
    else:
        new_numeric_part = 1000

    order_id = f"OR{new_numeric_part}"
    cursor.close()
    conn.close()

    return order_id

def generate_order_id_for_seller():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT MAX(OrderID) FROM seller_order")
    latest_order_id = cursor.fetchone()[0]

    if latest_order_id is not None:
        numeric_part = int(latest_order_id[2:])
        new_numeric_part = numeric_part + 1
    else:
        new_numeric_part = 1000

    order_id = f"OR{new_numeric_part}"
    cursor.close()
    conn.close()

    return order_id

def generate_order_date():
    current_datetime = datetime.now()

    order_date = current_datetime.strftime('%Y-%m-%d %H:%M:%S')

    return order_date

def insert_into_buyer_order(user_id, item_id, shipping_address, product_total, payment_optionsid):
    conn = get_db_connection()
    cursor = conn.cursor()

    order_query = """
        INSERT INTO buyer_order
        (OrderID, BuyerID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Order_Status, Shipping_Address, Shipping_Date, Payment_OptionsID)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    item_id = eval(item_id)
    product_id = item_id[0]
    variation_id = item_id[1]
    quantity = get_quantity_from_cart(user_id, product_id, variation_id)
    order_id = generate_order_id_for_buyer()
    order_date = generate_order_date()

    quantity_value = quantity[0]

    order_values = (order_id, user_id, product_id, variation_id, quantity_value, product_total, order_date, 'waiting for payment', shipping_address, 'waiting for payment', payment_optionsid)

    cursor.execute(order_query, order_values)
    conn.commit()

    cursor.close()
    conn.close()

def insert_into_seller_order(seller_id, user_id, item_id, shipping_address, product_total, payment_optionsid):
    conn = get_db_connection()
    cursor = conn.cursor()

    order_query = """
        INSERT INTO seller_order
        (OrderID, SellerID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Order_Status, Shipping_Address, Shipping_Date, Payment_OptionsID)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    item_id = eval(item_id)
    product_id = item_id[0]
    variation_id = item_id[1]
    quantity = get_quantity_from_cart(user_id, product_id, variation_id)
    order_id = generate_order_id_for_seller()
    order_date = generate_order_date()

    quantity_value = quantity[0]

    order_values = (order_id, seller_id, product_id, variation_id, quantity_value, product_total, order_date, 'waiting for payment', shipping_address, 'waiting for payment', payment_optionsid)

    cursor.execute(order_query, order_values)
    conn.commit()

    cursor.close()
    conn.close()

def get_quantity_from_cart(user_id, product_id, variation_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT Cart_Quantity FROM cart WHERE BuyerID = %s AND ProductID = %s AND VariationID = %s"
    cursor.execute(query, (user_id, product_id, variation_id))
    quantity = cursor.fetchone()

    cursor.close()
    conn.close()

    return quantity

@cart_app.route('/cart', methods=['GET', 'POST'])
def cart():
    user_id = session.get('user_id')
    if 'user_id' not in session:
        session['user_id'] = user_id
    cart_items = fetch_cart_items_for_buyer(user_id)

    return render_template('cart.html', cart_items=cart_items)

# CART QUANTITY
@cart_app.route('/update_quantity', methods=['POST'])
def update_quantity():
    try:
        item_id = request.json.get('item_id')
        new_quantity = int(request.json.get('new_quantity'))

        conn = get_db_connection()
        cursor = conn.cursor()

        update_query = "UPDATE cart SET Cart_Quantity = %s WHERE ProductID = %s AND VariationID = %s AND BuyerID = %s"
        cursor.execute(update_query, (new_quantity, *item_id.split('_'), session['user_id']))
        conn.commit()

        cursor.close()
        conn.close()

        return {'success': True, 'message': 'Quantity updated successfully'}
    except Exception as e:
        return {'success': False, 'message': str(e)}
   
@cart_app.route('/remove_item', methods=['POST'])
def remove_item():
    try:
        item_id = request.json.get('item_id')

        conn = get_db_connection()
        cursor = conn.cursor()

        remove_query = "DELETE FROM cart WHERE ProductID = %s AND VariationID = %s AND BuyerID = %s"
        cursor.execute(remove_query, (*item_id.split('_'), session['user_id']))
        conn.commit()

        cursor.close()
        conn.close()

        return {'success': True, 'message': 'Item removed successfully'}
    except Exception as e:
        return {'success': False, 'message': str(e)}

@cart_app.route('/checkout', methods=['POST'])
def checkout():
    selected_items = request.form.getlist('selected_items')

    if selected_items:
        selected_items_details, payment_options, total_payment = fetch_selected_items_details(selected_items)
        return render_template('checkout.html', selected_items_details=selected_items_details, payment_options=payment_options, total_payment=total_payment)

    else:
        message = "Please select items first."
        return render_template('checkout.html', message=message)

@cart_app.route('/process_checkout', methods=['POST'])
def process_checkout():
    try:
        user_id = session.get('user_id')
        shipping_address = request.form.get('shipping_address')
        selected_items = request.form.getlist('selected_items')
        product_totals = request.form.getlist('product_total[]')
        payment_options_json = request.form.get('payment_option_id')
        payment_options = json.loads(payment_options_json)

        if selected_items and product_totals and payment_options:
            for item_id, product_total in zip(selected_items, product_totals):
                seller_id = eval(item_id)[8]
                variation_id = eval(item_id)[1]
                cart_quantity = eval(item_id)[5]
                payment_option_id = payment_options.get(variation_id, '')

                insert_into_buyer_order(user_id, item_id, shipping_address, product_total, payment_option_id)

                insert_into_seller_order(seller_id, user_id, item_id, shipping_address, product_total, payment_option_id)

                delete_item_from_cart(user_id, item_id)
                decrease_quantity(variation_id, cart_quantity)

            print("Data saved to the database.")
            return redirect('/homepage_buyer')
        else:
            message = "Please select items and payment option first."
            return render_template('checkout.html', message=message)

    except Exception as e:
        print("Error:", str(e))
        message = "An error occurred. Please try again."
        return render_template('checkout.html', message=message)

def delete_item_from_cart(user_id, item_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    delete_query = "DELETE FROM cart WHERE ProductID = %s AND VariationID = %s AND BuyerID = %s"

    try:
        item_id = eval(item_id)
        product_id = item_id[0]
        variation_id = item_id[1]

        cursor.execute(delete_query, (product_id, variation_id, user_id))
        conn.commit()

    except Exception as e:
        print("Error deleting item from cart:", str(e))

    finally:
        cursor.close()
        conn.close()

def decrease_quantity(variation_id, cart_quantity):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        quantity_query = "SELECT Quantity FROM product_variation WHERE VariationID = %s"
        cursor.execute(quantity_query, (variation_id,))
        current_quantity = cursor.fetchone()[0]

        new_quantity = max(current_quantity - cart_quantity, 0)

        update_query = "UPDATE product_variation SET Quantity = %s WHERE VariationID = %s"
        cursor.execute(update_query, (new_quantity, variation_id))
        conn.commit()

    except Exception as e:
        print("Error decreasing quantity:", str(e))

    finally:
        cursor.close()
        conn.close()
