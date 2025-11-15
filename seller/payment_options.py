from flask import Blueprint, render_template, request, redirect, session, url_for
import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()

payment_options_app = Blueprint('payment_options', __name__)

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("AIVEN_HOST"),
        port=os.getenv("AIVEN_PORT"),
        user=os.getenv("AIVEN_USER"),
        password=os.getenv("AIVEN_PASSWORD"),
        database=os.getenv("AIVEN_DATABASE"),
        use_pure=True
    )

db_config = {
    "host": os.getenv("AIVEN_HOST"),
    "port": int(os.getenv("AIVEN_PORT", 19441)),  
    "user": os.getenv("AIVEN_USER"),
    "password": os.getenv("AIVEN_PASSWORD"),
    "database": os.getenv("AIVEN_DATABASE")                               
}

class PaymentOptions:
    def __init__(self, payment_method, account_number):
        self.payment_method = payment_method
        self.account_number = account_number

    def generate_payment_options_id(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(Payment_OptionsID) FROM payment_options")
        latest_payment_options_id = cursor.fetchone()[0]

        if latest_payment_options_id is not None:
            numeric_part = int(latest_payment_options_id[2:])
            new_numeric_part = numeric_part + 1
        else:
            new_numeric_part = 1000

        payment_options_id = f"PO{new_numeric_part}"
        cursor.close()
        conn.close()

        return payment_options_id

    def insert_into_database(self, user_id):
        conn = get_db_connection()
        cursor = conn.cursor()

        payment_options_id = self.generate_payment_options_id()

        sql_query = "INSERT INTO payment_options (Payment_OptionsID, SellerID, Payment_Method, Account_Number) VALUES (%s, %s, %s, %s)"
        values = (payment_options_id, user_id, self.payment_method, self.account_number)

        cursor.execute(sql_query, values)
        conn.commit()
        cursor.close()
        conn.close()

@payment_options_app.route('/payment_options', methods=['GET', 'POST'])
def payment_options():
    user_id = session.get('user_id')
    if 'user_id' not in session:
        session['user_id'] = user_id
    selected_options_from_form = {}

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM payment_options WHERE SellerID = %s", (user_id,))
    existing_payment_options_count = cursor.fetchone()[0]
    cursor.close()
    conn.close()

    if existing_payment_options_count > 0:

        return redirect(url_for('payment_options.edit_payment_options'))

    if request.method == 'POST':
        print("Form submitted")

        selected_payment_methods = request.form.getlist('selected_payment_methods[]')

        account_numbers_from_form = [request.form.get(f'account_numbers[]-{method}', '') for method in selected_payment_methods]
        print("Received Payment Methods:", selected_payment_methods)
        print("Received Account Numbers from Form:", account_numbers_from_form)

        selected_options_from_form = dict(zip(selected_payment_methods, account_numbers_from_form))

        for payment_method_form, account_number_form in selected_options_from_form.items():
           
            if payment_method_form == 'Cash on Delivery':
                account_number_form = 'None'

            payment_options = PaymentOptions(payment_method_form, account_number_form)
            payment_options.insert_into_database(user_id)

        return redirect(url_for('payment_options.edit_payment_options'))

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM methods_of_payment")
    payment_methods = cursor.fetchall()
    cursor.close()
    conn.close()

    return render_template('payment_options.html', payment_methods=payment_methods,
                           selected_options_from_form=selected_options_from_form)

@payment_options_app.route('/edit_payment_options', methods=['GET', 'POST'])
def edit_payment_options():
    user_id = session.get('user_id')
    if 'user_id' not in session:
        session['user_id'] = user_id

    if request.method == 'POST':
     
        if 'edit_options' in request.form:
           
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM payment_options WHERE SellerID = %s", (user_id,))
            conn.commit()
            cursor.close()
            conn.close()

            return redirect(url_for('payment_options.payment_options'))

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM payment_options WHERE SellerID = %s", (user_id,))
    existing_payment_options = cursor.fetchall()
    cursor.close()
    conn.close()

    return render_template('edit_payment_options.html', existing_payment_options=existing_payment_options)