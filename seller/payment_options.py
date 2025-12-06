from flask import Blueprint, render_template, request, redirect, session, url_for, flash, jsonify
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
        sql_query = """
            INSERT INTO payment_options 
            (Payment_OptionsID, SellerID, Payment_Method, Account_Number, Status) 
            VALUES (%s, %s, %s, %s, 'active')
        """
        values = (payment_options_id, user_id, self.payment_method, self.account_number)
        cursor.execute(sql_query, values)
        conn.commit()
        cursor.close()
        conn.close()


def _fetch_payment_methods():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT Payment_MethodID, Payment_Method FROM methods_of_payment")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{'id': row[0], 'name': row[1]} for row in rows]


def _fetch_active_options(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT Payment_Method, Account_Number FROM payment_options WHERE SellerID = %s AND Status = 'active'",
        (user_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return {row[0]: row[1] for row in rows}


def _deactivate_active_options(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE payment_options SET Status = 'old' WHERE SellerID = %s AND Status = 'active'",
        (user_id,),
    )
    conn.commit()
    cursor.close()
    conn.close()


@payment_options_app.route('/payment_options', methods=['GET', 'POST'])
def payment_options():
    user_id = session.get('user_id')
    if not user_id:
        return redirect('/login')

    conn = get_db_connection()
    cursor = conn.cursor()

    # Fetch all payment methods
    cursor.execute("SELECT * FROM methods_of_payment")
    payment_methods = cursor.fetchall()

    # Fetch active payment options
    cursor.execute("""
        SELECT Payment_Method, Account_Number 
        FROM payment_options 
        WHERE SellerID = %s AND Status='active'
    """, (user_id,))
    existing_active_options = cursor.fetchall()
    existing_active_dict = {method: acct for method, acct in existing_active_options}

    cursor.close()
    conn.close()

    if request.method == 'POST':
        # Get selected methods and account numbers
        selected_payment_methods = request.form.getlist('selected_payment_methods[]')
        account_numbers_from_form = [
            request.form.get(f'account_numbers[]-{method}', '') for method in selected_payment_methods
        ]
        selected_options_from_form = dict(zip(selected_payment_methods, account_numbers_from_form))

        # Check if any required account number is empty
        for method, acct in selected_options_from_form.items():
            if method != 'Cash on Delivery' and (acct is None or acct.strip() == ''):
                merged_options = existing_active_dict.copy()
                merged_options.update(selected_options_from_form) 

                return render_template(
                    'payment_options.html',
                    payment_methods=payment_methods,
                    selected_options_from_form=merged_options,
                    empty_account_alert=method 
                )


        # If all account numbers are filled, insert
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE payment_options
            SET Status = 'old'
            WHERE SellerID = %s AND Status='active'
        """, (user_id,))
        conn.commit()

        for payment_method_form, account_number_form in selected_options_from_form.items():
            if payment_method_form == 'Cash on Delivery':
                account_number_form = 'None'
            payment_option = PaymentOptions(payment_method_form, account_number_form)
            payment_option.insert_into_database(user_id)

        cursor.close()
        conn.close()
        return redirect(url_for('payment_options.payment_options'))

    prefill_options = {method[1]: existing_active_dict.get(method[1], '') for method in payment_methods}

    return render_template(
        'payment_options.html',
        payment_methods=payment_methods,
        selected_options_from_form=prefill_options
    )


@payment_options_app.route('/api/seller/payment-options', methods=['GET'])
def api_get_seller_payment_options():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'ok': False, 'message': 'Authentication required.'}), 401
    methods = _fetch_payment_methods()
    active_options = _fetch_active_options(user_id)
    return jsonify({'ok': True, 'methods': methods, 'active_options': active_options})


@payment_options_app.route('/api/seller/payment-options', methods=['POST'])
def api_save_seller_payment_options():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'ok': False, 'message': 'Authentication required.'}), 401
    data = request.get_json() or {}
    selected_options = data.get('selectedOptions', {})
    required_account_methods = {'GCash', 'Paymaya', 'BDO', 'BPI'}

    for method, account in selected_options.items():
        if method in required_account_methods and (not account or not account.strip()):
            return (
                jsonify({'ok': False, 'message': f'Account number required for {method}.'}),
                400,
            )

    _deactivate_active_options(user_id)
    for method, account in selected_options.items():
        if method == 'Cash on Delivery':
            account = 'None'
        payment_option = PaymentOptions(method, account)
        payment_option.insert_into_database(user_id)

    return jsonify({'ok': True, 'message': 'Payment options updated.'})
