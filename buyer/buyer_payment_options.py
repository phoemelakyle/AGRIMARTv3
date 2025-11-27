from flask import Blueprint, render_template, request, redirect, session, url_for, flash
import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()

buyer_payment_options_app = Blueprint('buyer_payment_options', __name__)

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("AIVEN_HOST"),
        port=os.getenv("AIVEN_PORT"),
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
            INSERT INTO buyer_payment_options
            (Payment_OptionsID, BuyerID, Payment_Method, Account_Number, Status) 
            VALUES (%s, %s, %s, %s, 'active')
        """
        values = (payment_options_id, user_id, self.payment_method, self.account_number)
        cursor.execute(sql_query, values)
        conn.commit()
        cursor.close()
        conn.close()


@buyer_payment_options_app.route('/buyer_payment_options', methods=['GET', 'POST'])
def buyer_payment_options():
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
        FROM buyer_payment_options 
        WHERE BuyerID = %s AND Status='active'
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
                    'buyer_payment_options.html',
                    payment_methods=payment_methods,
                    selected_options_from_form=merged_options,
                    empty_account_alert=method 
                )


        # If all account numbers are filled, insert
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE buyer_payment_options
            SET Status = 'old'
            WHERE BuyerID = %s AND Status='active'
        """, (user_id,))
        conn.commit()

        for payment_method_form, account_number_form in selected_options_from_form.items():
            if payment_method_form == 'Cash on Delivery':
                account_number_form = 'None'
            payment_option = BuyerPaymentOptions(payment_method_form, account_number_form)
            payment_option.insert_into_database(user_id)

        cursor.close()
        conn.close()
        return redirect(url_for('buyer_payment_options.buyer_payment_options'))

    prefill_options = {method[1]: existing_active_dict.get(method[1], '') for method in payment_methods}

    return render_template(
        'buyer_payment_options.html',
        payment_methods=payment_methods,
        selected_options_from_form=prefill_options
    )
