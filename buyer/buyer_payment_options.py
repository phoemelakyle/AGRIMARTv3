from flask import Blueprint, render_template, request, redirect, session, url_for
import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()

buyer_payment_options_app = Blueprint('buyer_payment_options', __name__)

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("AIVEN_HOST"),
        port=int(os.getenv("AIVEN_PORT", 19441)),
        user=os.getenv("AIVEN_USER"),
        password=os.getenv("AIVEN_PASSWORD"),
        database=os.getenv("AIVEN_DATABASE"),
        use_pure=True
    )

class BuyerPaymentOptions:
    def __init__(self, payment_method, account_number):
        self.payment_method = payment_method
        self.account_number = account_number

    def generate_payment_options_id(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(Payment_OptionsID) FROM buyer_payment_options")
        latest_id = cursor.fetchone()[0]

        if latest_id is not None:
            numeric_part = int(latest_id[2:])
            new_numeric_part = numeric_part + 1
        else:
            new_numeric_part = 1000

        payment_options_id = f"PO{new_numeric_part}"
        cursor.close()
        conn.close()
        return payment_options_id

    def insert_into_database(self, buyer_id):
        conn = get_db_connection()
        cursor = conn.cursor()

        payment_options_id = self.generate_payment_options_id()
        sql_query = """
            INSERT INTO buyer_payment_options 
            (Payment_OptionsID, BuyerID, Payment_Method, Account_Number) 
            VALUES (%s, %s, %s, %s)
        """
        values = (payment_options_id, buyer_id, self.payment_method, self.account_number)

        cursor.execute(sql_query, values)
        conn.commit()
        cursor.close()
        conn.close()

@buyer_payment_options_app.route('/buyer_payment_options', methods=['GET', 'POST'])
def buyer_payment_options():
    buyer_id = session.get('user_id')
    if not buyer_id:
        return redirect(url_for('login'))  # Redirect if user not logged in

    selected_options_from_form = {}

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM buyer_payment_options WHERE BuyerID = %s", (buyer_id,))
    existing_count = cursor.fetchone()[0]
    cursor.close()
    conn.close()

    if existing_count > 0:
        return redirect(url_for('buyer_payment_options.edit_buyer_payment_options'))

    if request.method == 'POST':
        selected_payment_methods = request.form.getlist('selected_payment_methods[]')
        account_numbers_from_form = [
            request.form.get(f'account_numbers[]-{method}', '') for method in selected_payment_methods
        ]

        selected_options_from_form = dict(zip(selected_payment_methods, account_numbers_from_form))

        for payment_method_form, account_number_form in selected_options_from_form.items():
            if payment_method_form == 'Cash on Delivery':
                account_number_form = 'None'

            payment_option = BuyerPaymentOptions(payment_method_form, account_number_form)
            payment_option.insert_into_database(buyer_id)

        return redirect(url_for('buyer_payment_options.edit_buyer_payment_options'))

    # Get all available payment methods
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM methods_of_payment")
    payment_methods = cursor.fetchall()
    cursor.close()
    conn.close()

    return render_template(
        'buyer_payment_options.html',
        payment_methods=payment_methods,
        selected_options_from_form=selected_options_from_form
    )

@buyer_payment_options_app.route('/edit_buyer_payment_options', methods=['GET', 'POST'])
def edit_buyer_payment_options():
    buyer_id = session.get('user_id')
    if not buyer_id:
        return redirect(url_for('login'))  # Redirect if user not logged in

    if request.method == 'POST' and 'edit_options' in request.form:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM buyer_payment_options WHERE BuyerID = %s", (buyer_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return redirect(url_for('buyer_payment_options.buyer_payment_options'))

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM buyer_payment_options WHERE BuyerID = %s", (buyer_id,))
    existing_options = cursor.fetchall()
    cursor.close()
    conn.close()

    return render_template('edit_buyer_payment_options.html', existing_payment_options=existing_options)
