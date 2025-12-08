from flask import Blueprint, render_template, request, redirect, flash, session, jsonify
import mysql.connector
import os

buyer_account_app = Blueprint('buyer_account', __name__)

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


def _format_buyer_row(row):
    if not row:
        return None
    return {
        'buyerId': row['BuyerID'],
        'username': row.get('Username'),
        'name': row.get('Name'),
        'email': row.get('Email'),
        'phone': row.get('Phone_Number'),
    }

@buyer_account_app.route('/buyer_account', methods=['GET', 'POST'])
def buyer_account():
    buyer_id = session.get('BuyerID')

    if not buyer_id:
        return redirect('/login')  

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        # Get form data
        username = request.form.get('username')
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone')

        # Update buyer table
        update_query = """
            UPDATE buyer
            SET Username=%s, Name=%s, Email=%s, Phone_Number=%s
            WHERE BuyerID=%s
        """
        cursor.execute(update_query, (username, name, email, phone, buyer_id))
        conn.commit()
        flash('Profile updated successfully!', 'success')

    # Fetch current buyer info
    cursor.execute("""
        SELECT BuyerID, Name, Email, Phone_Number, Username
        FROM buyer
        WHERE BuyerID = %s
    """, (buyer_id,))
    buyer = cursor.fetchone()

    cursor.close()
    conn.close()

    return render_template('account.html', buyer=buyer)


@buyer_account_app.route('/api/buyer_account', methods=['GET', 'PATCH'])
def api_buyer_account():
    buyer_id = session.get('BuyerID')
    if not buyer_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    if request.method == 'PATCH':
        payload = request.get_json(silent=True) or {}
        updates = []
        values = []
        if 'username' in payload:
            updates.append('Username = %s')
            values.append(payload['username'])
        if 'name' in payload:
            updates.append('Name = %s')
            values.append(payload['name'])
        if 'email' in payload:
            updates.append('Email = %s')
            values.append(payload['email'])
        if 'phone' in payload:
            updates.append('Phone_Number = %s')
            values.append(payload['phone'])

        if updates:
            update_query = f"""
                UPDATE buyer
                SET {', '.join(updates)}
                WHERE BuyerID = %s
            """
            values.append(buyer_id)
            cursor.execute(update_query, tuple(values))
            conn.commit()

    cursor.execute(
        """
        SELECT BuyerID, Username, Name, Email, Phone_Number
        FROM buyer
        WHERE BuyerID = %s
        """,
        (buyer_id,),
    )
    buyer = cursor.fetchone()

    cursor.close()
    conn.close()

    if not buyer:
        return jsonify({'success': False, 'message': 'Buyer not found.'}), 404

    return jsonify({'success': True, 'buyer': _format_buyer_row(buyer)})
