from flask import Blueprint, render_template, request, redirect, flash, session, url_for
import mysql.connector
import bcrypt
import os



homepage_buyer_app = Blueprint('homepage_buyer', __name__)


db_config = {
    "host": os.getenv("AIVEN_HOST"),
    "port": int(os.getenv("AIVEN_PORT", 19441)),  # default port if not set
    "user": os.getenv("AIVEN_USER"),
    "password": os.getenv("AIVEN_PASSWORD"),
    "database": os.getenv("AIVEN_DATABASE"),
    "use_pure": True                                 
}


def get_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        return connection
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None


@homepage_buyer_app.route('/homepage_buyer', methods=['GET', 'POST'])
def homepage_buyer():
    product_data = []
    categories = []
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)


            category_query = "SELECT CategoryID, Category_Name FROM product_category"
            cursor.execute(category_query)
            categories = cursor.fetchall()


            product_query = """
            SELECT p.ProductID, p.Product_Name, MIN(pv.Price) as MinPrice, MAX(pv.Price) as MaxPrice, p.ImageFileName
            FROM product p
            JOIN product_variation pv ON p.ProductID = pv.ProductID
            GROUP BY p.ProductID, p.Product_Name, p.ImageFileName
            """
            cursor.execute(product_query)
            product_data = cursor.fetchall()


    except mysql.connector.Error as err:
        print(f"Database error: {err}")


    return render_template('homepage_buyer.html', product_data=product_data, categories=categories)


@homepage_buyer_app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return redirect('/login')


@homepage_buyer_app.route('/filter/<string:category_name>', methods=['POST','GET'])
def filter_products(category_name):
    global _categories
    try:
        if category_name.lower() == "all":
            return redirect(url_for('homepage_buyer.homepage_buyer'))
           
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)


            category_query = f"SELECT CategoryID FROM product_category WHERE Category_Name = '{category_name}'"
            cursor.execute(category_query)
            category_result = cursor.fetchone()


            if category_result:
                category_id = category_result['CategoryID']


                product_query = f"""
                SELECT p.ProductID, p.Product_Name, p.ImageFileName,
                       MIN(pv.Price) AS MinPrice, MAX(pv.Price) AS MaxPrice
                FROM product p
                LEFT JOIN product_variation pv ON p.ProductID = pv.ProductID
                WHERE p.CategoryID = '{category_id}'
                GROUP BY p.ProductID, p.Product_Name, p.ImageFileName
                """
                cursor.execute(product_query)
                product_data = cursor.fetchall()


                category_query = "SELECT CategoryID, Category_Name FROM product_category"
                cursor.execute(category_query)
                categories = cursor.fetchall()


                return render_template('filter.html', product_data=product_data, categories=categories )
           
    except mysql.connector.Error as err:
        print(f"Database error: {err}")


    return "Internal server error", 500


def get_categories ():
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            category_query = "SELECT CategoryID, Category_Name FROM product_category"
            cursor.execute(category_query)
            categories_stat = cursor.fetchall()
            return categories_stat
       
    except mysql.connector.Error as err:
        print(f"Database error: {err}")


def get_to_pay_orders_data(user_id, sort='recent'):
    order_details = []


    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)


            categories = get_categories()


           
            if sort == 'old':
                order_by = 'ASC'
            else:
                order_by = 'DESC'






            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Payment_OptionsID, Shipping_Address, Order_Date
            FROM buyer_order
            WHERE Order_Status = 'waiting for payment' AND BuyerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (user_id,))
            orders = cursor.fetchall()
           
           
            for order in orders:
                order_id = order['OrderID']
                product_id = order['ProductID']
                variation_id = order['VariationID']
                quantity = order['Quantity']
                shipping_address = order['Shipping_Address']
                order_date = order['Order_Date']


                query_product = """
                SELECT Product_Name, ImageFileName, Shipping_Fee
                FROM product
                WHERE ProductID = %s
                """
                cursor.execute(query_product, (product_id,))
                product_info = cursor.fetchone()


                query_variation = """
                SELECT Unit, Price
                FROM product_variation
                WHERE VariationID = %s
                """
                cursor.execute(query_variation, (variation_id,))
                variation_info = cursor.fetchone()


                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Quantity': order['Quantity'],
                    'OrderID': order['OrderID'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'Shipping_Address': order['Shipping_Address'],
                    'Order_Date': order['Order_Date'],
                }
                order_details.append(order_detail)


            print(sort)
            print("ORDER BY:", order_by)
            print("Final Query:", query_orders)
    except mysql.connector.Error as err:
        print(f"Error: {err}")


    return order_details, categories


@homepage_buyer_app.route('/to-pay-orders', methods=['POST','GET'])
def to_pay_orders():
    user_id = session.get('user_id')
    sort = request.args.get('sort', 'recent')
    order_details, categories = get_to_pay_orders_data(user_id, sort)


    order_type = 'to_pay'
    return render_template('buyer_order.html', order_details=order_details, order_type=order_type, categories=categories)






@homepage_buyer_app.route('/pay-now/<order_id>', methods=['POST'])
def pay_now(order_id):
    user_id = session.get('user_id')


    order_details, categories = get_to_pay_orders_data(user_id)
   
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()




            # Update Buyer_Order status
            update_query = """
            UPDATE buyer_order
            SET Order_Status = 'pending', Shipping_Date = 'waiting for shipment'
            WHERE BuyerID = %s AND OrderID = %s
            """
            cursor.execute(update_query, (user_id, order_id))
            connection.commit()


            # Update Seller_Order status
            update_query = """
            UPDATE seller_order
            SET Order_Status = 'pending', Shipping_Date = 'waiting for shipment'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            connection.commit()


    except mysql.connector.Error as err:
        print(f"Error: {err}")


    # Redirect to the order page with a flag to refresh
    return redirect(url_for('homepage_buyer.to_pay_orders', order_type='to_pay', order_details=order_details, categories=categories, refresh_page='true'))




@homepage_buyer_app.route('/to-ship-orders', methods=['POST','GET'])
def to_ship_orders():
    user_id = session.get('user_id')
    order_details = []  


    sort = request.args.get('sort', 'recent')
   
   


    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            categories=get_categories()


            order_by = 'ASC' if sort == 'old' else 'DESC'


            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Payment_OptionsID, Shipping_Address, Order_Date
            FROM buyer_order
            WHERE Order_Status = 'pending' AND BuyerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (user_id,))
            orders = cursor.fetchall()
            print(orders)
            for order in orders:
                product_id = order['ProductID']
                variation_id = order['VariationID']
                order_date = order['Order_Date']


                query_product = """
                SELECT Product_Name, ImageFileName, Shipping_Fee
                FROM product
                WHERE ProductID = %s
                """
                cursor.execute(query_product, (product_id,))
                product_info = cursor.fetchone()
               
                print(product_info)


                query_variation = """
                SELECT Unit, Price
                FROM product_variation
                WHERE VariationID = %s
                """
                cursor.execute(query_variation, (variation_id,))
                variation_info = cursor.fetchone()
                print(variation_info)
         
                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Quantity': order['Quantity'],
                    'Unit': variation_info['Unit'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'OrderID': order['OrderID'],
                    'Shipping_Address': order['Shipping_Address'],
                    'Order_Date': order['Order_Date'],
                }
                order_details.append(order_detail)


    except mysql.connector.Error as err:
        print(f"Error: {err}")
       
    order_type = 'to_ship'
    return render_template('buyer_order.html', order_details=order_details, order_type=order_type, categories=categories)


def get_shipping_orders_data(user_id, sort='recent'):
    order_details = []
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)


            if sort == 'old':
                order_by = 'ASC'
            else:
                order_by = 'DESC'


            categories = get_categories()


            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Payment_OptionsID, Shipping_Address, Shipping_Date, Order_Date
            FROM buyer_order
            WHERE Order_Status = 'shipping' AND BuyerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (user_id,))
            orders = cursor.fetchall()
           
            for order in orders:
                order_id = order['OrderID']
                product_id = order['ProductID']
                variation_id = order['VariationID']
                quantity = order['Quantity']
                shipping_address = order['Shipping_Address']
                order_date = order['Order_Date']


                query_product = """
                SELECT Product_Name, ImageFileName, Shipping_Fee
                FROM product
                WHERE ProductID = %s
                """
                cursor.execute(query_product, (product_id,))
                product_info = cursor.fetchone()


                query_variation = """
                SELECT Unit, Price
                FROM product_variation
                WHERE VariationID = %s
                """
                cursor.execute(query_variation, (variation_id,))
                variation_info = cursor.fetchone()


                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Quantity': order['Quantity'],
                    'OrderID': order['OrderID'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'Shipping_Date': order['Shipping_Date'],
                    'Shipping_Address': order['Shipping_Address'],
                    'Order_Date': order['Order_Date'],
                }
                order_details.append(order_detail)


    except mysql.connector.Error as err:
        print(f"Error: {err}")
       
    return order_details, categories


@homepage_buyer_app.route('/shipping-orders', methods=['POST','GET'])
def shipping_orders():
    user_id = session.get('user_id')
    sort = request.args.get('sort', 'recent')
    order_details, categories = get_shipping_orders_data(user_id, sort)


    order_type = 'shipping'
    return render_template('buyer_order.html', order_details=order_details, order_type=order_type, categories=categories)


@homepage_buyer_app.route('/order-received/<order_id>', methods=['POST', 'GET'])
def order_received(order_id):
    user_id = session.get('user_id')
   
    order_details, categories = get_shipping_orders_data(user_id)
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()


            update_query = """
            UPDATE buyer_order
            SET Order_Status = 'delivered'
            WHERE BuyerID = %s AND OrderID = %s
            """
            cursor.execute(update_query, (user_id, order_id))
            connection.commit()


            update_query = """
            UPDATE seller_order
            SET Order_Status = 'delivered'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            connection.commit()


    except mysql.connector.Error as err:
        print(f"Error: {err}")
       
   


    return redirect(url_for('homepage_buyer.shipping_orders', order_type='shipping', order_details=order_details, categories=categories, refresh_page='true'))




@homepage_buyer_app.route('/delivered-orders', methods=['POST','GET'])
def delivered_orders():
    user_id = session.get('user_id')
    order_details = []  
    sort = request.args.get('sort', 'recent')
   
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            categories=get_categories()


            order_by = 'ASC' if sort == 'old' else 'DESC'


            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Payment_OptionsID, Shipping_Address, Shipping_Date, Order_Date
            FROM buyer_order
            WHERE Order_Status = 'delivered' AND BuyerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (user_id,))
            orders = cursor.fetchall()
            print(orders)
            for order in orders:
                product_id = order['ProductID']
                variation_id = order['VariationID']
                order_date = order['Order_Date']


                query_product = """
                SELECT Product_Name, ImageFileName, Shipping_Fee
                FROM product
                WHERE ProductID = %s
                """
                cursor.execute(query_product, (product_id,))
                product_info = cursor.fetchone()
               
                print(product_info)
             
                query_variation = """
                SELECT Unit, Price
                FROM product_variation
                WHERE VariationID = %s
                """
                cursor.execute(query_variation, (variation_id,))
                variation_info = cursor.fetchone()
                print(variation_info)
               
                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'OrderID': order['OrderID'],
                    'Shipping_Address': order['Shipping_Address'],
                    'Shipping_Date': order['Shipping_Date'],
                    'Quantity': order['Quantity'],
                    'Order_Date': order['Order_Date'],
                }
                order_details.append(order_detail)


    except mysql.connector.Error as err:
        print(f"Error: {err}")
   
    order_type = 'delivered'
    return render_template('buyer_order.html', order_details=order_details, order_type=order_type, categories=categories)


def get_cancelled_orders_data(user_id, sort='recent'):
    order_details = []


    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)


            categories = get_categories()


            if sort == 'old':
                order_by = 'ASC'
            else:
                order_by = 'DESC'


            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Payment_OptionsID, Shipping_Address, Order_Date
            FROM buyer_order
            WHERE Order_Status = 'cancelled' AND BuyerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (user_id,))
            orders = cursor.fetchall()
           
            for order in orders:
                order_id = order['OrderID']
                product_id = order['ProductID']
                variation_id = order['VariationID']
                quantity = order['Quantity']
                shipping_address = order['Shipping_Address']
                order_date = order['Order_Date']


                query_product = """
                SELECT Product_Name, ImageFileName, Shipping_Fee
                FROM product
                WHERE ProductID = %s
                """
                cursor.execute(query_product, (product_id,))
                product_info = cursor.fetchone()


                query_variation = """
                SELECT Unit, Price
                FROM product_variation
                WHERE VariationID = %s
                """
                cursor.execute(query_variation, (variation_id,))
                variation_info = cursor.fetchone()


                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Quantity': order['Quantity'],
                    'OrderID': order['OrderID'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'Shipping_Address': order['Shipping_Address'],
                    'Order_Date': order['Order_Date'],
                }
                order_details.append(order_detail)


    except mysql.connector.Error as err:
        print(f"Error: {err}")


    return order_details, categories


@homepage_buyer_app.route('/cancelled-orders', methods=['POST','GET'])
def cancelled_orders():
    user_id = session.get('user_id')
    sort = request.args.get('sort', 'recent')
    order_details, categories = get_cancelled_orders_data(user_id, sort)


    order_type = 'cancelled'
    return render_template('buyer_order.html', order_details=order_details, order_type=order_type, categories=categories)


def get_to_ship_orders_data(user_id, sort='recent'):
    order_details = []
   
    sort = request.args.get('sort', 'recent')


    if sort == 'old':
        order_by = 'ASC'
    else:
        order_by = 'DESC'


    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)


            categories = get_categories()


            query_orders = f"""
            SELECT OrderID, ProductID, VariationID, Quantity, Total_Amount, Order_Date, Payment_OptionsID, Shipping_Address, Order_Date
            FROM buyer_order
            WHERE Order_Status = 'pending' AND BuyerID = %s
            ORDER BY Order_Date {order_by}
            """
            cursor.execute(query_orders, (user_id,))
            orders = cursor.fetchall()
           
            for order in orders:
                order_id = order['OrderID']
                product_id = order['ProductID']
                variation_id = order['VariationID']
                quantity = order['Quantity']
                shipping_address = order['Shipping_Address']
                order_date = order['Order_Date']


                query_product = """
                SELECT Product_Name, ImageFileName, Shipping_Fee
                FROM product
                WHERE ProductID = %s
                """
                cursor.execute(query_product, (product_id,))
                product_info = cursor.fetchone()


                query_variation = """
                SELECT Unit, Price
                FROM product_variation
                WHERE VariationID = %s
                """
                cursor.execute(query_variation, (variation_id,))
                variation_info = cursor.fetchone()


                order_detail = {
                    'ImageFileName': product_info['ImageFileName'],
                    'Product_Name': product_info['Product_Name'],
                    'Shipping_Fee': product_info['Shipping_Fee'],
                    'Unit': variation_info['Unit'],
                    'Quantity': order['Quantity'],
                    'OrderID': order['OrderID'],
                    'Price': variation_info['Price'],
                    'Total_Amount': order['Total_Amount'],
                    'Shipping_Address': order['Shipping_Address'],
                    'Order_Date': order['Order_Date'],
                }
                order_details.append(order_detail)


    except mysql.connector.Error as err:
        print(f"Error: {err}")
   
    return order_details, categories


@homepage_buyer_app.route('/cancel-order/<order_id>', methods=['POST', 'GET'])
def cancel_to_pay(order_id):
    user_id = session.get('user_id')
 
    order_details, categories = get_to_pay_orders_data(user_id)


    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()


            update_query = """
            UPDATE buyer_order
            SET Order_Status = 'cancelled'
            WHERE BuyerID = %s AND OrderID = %s
            """
            cursor.execute(update_query, (user_id, order_id))
            connection.commit()


            update_query = """
            UPDATE seller_order
            SET Order_Status = 'cancelled'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            connection.commit()


            get_variation_id_query = "SELECT VariationID FROM buyer_order WHERE OrderID = %s"
            cursor.execute(get_variation_id_query, (order_id,))
            variation_id = cursor.fetchone()[0]


            buyer_order_quantity_query = "SELECT Quantity FROM buyer_order WHERE OrderID = %s"
            cursor.execute(buyer_order_quantity_query, (order_id,))
            by_quantity = cursor.fetchone()[0]
            print(by_quantity)


            product_variation_quantity_query = "SELECT Quantity FROM product_variation WHERE VariationID = %s"
            cursor.execute(product_variation_quantity_query, (variation_id,))      
            pv_quantity = cursor.fetchone()[0]
            print(pv_quantity)


            new_quantity = max(pv_quantity + by_quantity, 0)
            print(new_quantity)


            update_query = "UPDATE product_variation SET Quantity = %s WHERE VariationID = %s"
            cursor.execute(update_query, (new_quantity, variation_id))
            connection.commit()


    except mysql.connector.Error as err:
        print(f"Error: {err}")
   
    order_type = 'to_pay'


    return redirect(url_for('homepage_buyer.to_pay_orders'))


@homepage_buyer_app.route('/cancel-order-2/<order_id>', methods=['POST', 'GET'])
def cancel_to_ship(order_id):
    user_id = session.get('user_id')
   
    order_details, categories = get_to_ship_orders_data(user_id)
    try:
        with get_db_connection() as connection:
            cursor = connection.cursor()


            update_query = """
            UPDATE buyer_order
            SET Order_Status = 'cancelled'
            WHERE BuyerID = %s AND OrderID = %s
            """
            cursor.execute(update_query, (user_id, order_id))
            connection.commit()


            update_query = """
            UPDATE seller_order
            SET Order_Status = 'cancelled'
            WHERE OrderID = %s
            """
            cursor.execute(update_query, (order_id,))
            connection.commit()


            get_variation_id_query = "SELECT VariationID FROM buyer_order WHERE OrderID = %s"
            cursor.execute(get_variation_id_query, (order_id,))
            variation_id = cursor.fetchone()[0]


            buyer_order_quantity_query = "SELECT Quantity FROM buyer_order WHERE OrderID = %s"
            cursor.execute(buyer_order_quantity_query, (order_id,))
            by_quantity = cursor.fetchone()[0]
            print(by_quantity)


            product_variation_quantity_query = "SELECT Quantity FROM product_variation WHERE VariationID = %s"
            cursor.execute(product_variation_quantity_query, (variation_id,))      
            pv_quantity = cursor.fetchone()[0]
            print(pv_quantity)


            new_quantity = max(pv_quantity + by_quantity, 0)
            print(new_quantity)


            update_query = "UPDATE product_variation SET Quantity = %s WHERE VariationID = %s"
            cursor.execute(update_query, (new_quantity, variation_id))
            connection.commit()


    except mysql.connector.Error as err:
        print(f"Error: {err}")


    order_type = 'to_ship'


    return redirect(url_for('homepage_buyer.to_ship_orders'))





