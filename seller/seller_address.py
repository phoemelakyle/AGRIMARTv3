from flask import Blueprint, render_template, request, redirect, flash, session, url_for
import mysql.connector
from datetime import datetime
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

@seller_address_app.route('/seller_address')
def seller_address():
    seller_id = session.get('SellerID')
    key = os.getenv("GOOGLE_MAPS_API_KEY").strip()

    addresses = []
    if seller_id:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT *, CAST(IsDefault AS UNSIGNED) AS IsDefaultInt FROM seller_addresses WHERE SellerID = %s", (seller_id,))
        addresses = cursor.fetchall()
        cursor.close()
        conn.close()

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
        flash("You must be logged in.")
        return redirect(url_for('seller_address.seller_address'))

    address_id = request.form.get('address_id')
    full_name = request.form['full_name']
    phone_number = request.form['phone_number']
    street = request.form['street']
    municipality = request.form['municipality']
    province = request.form['province']
    region = request.form['region']
    zip_code = request.form['zip_code']
    latitude = float(request.form['latitude'])
    longitude = float(request.form['longitude'])

    conn = get_db_connection()
    cursor = conn.cursor()
    if address_id and address_id.strip() != "":
        update_query = """
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
        """
        cursor.execute(update_query, (full_name, phone_number, street, municipality, province,
                                      region, zip_code, latitude, longitude,
                                      address_id, seller_id))
        conn.commit()
        cursor.close()
        conn.close()

        flash("Address updated successfully!")
        return redirect(url_for('seller_address.seller_address'))

    cursor.execute("SELECT MAX(AddressID) FROM seller_addresses")
    last_id = cursor.fetchone()[0]
    if last_id:
        new_id = f"SA{int(last_id[2:]) + 1:04d}"
    else:
        new_id = "SA1000"

    cursor.execute("SELECT COUNT(*) FROM seller_addresses WHERE SellerID=%s", (seller_id,))
    has_addresses = cursor.fetchone()[0]

    insert_query = """
        INSERT INTO seller_addresses
        (AddressID, SellerID, Full_Name, Phone_Number, Street, Municipality, Province, Region, Zip_Code, Latitude, Longitude, IsDefault)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    # If seller has no address yet, set IsDefault=1, else 0
    is_default = 1 if has_addresses == 0 else 0

    cursor.execute(insert_query, (new_id, seller_id, full_name, phone_number, street,
                                  municipality, province, region, zip_code,
                                  latitude, longitude, is_default))
    conn.commit()
    cursor.close()
    conn.close()

    flash("Address saved successfully!")
    return redirect(url_for('seller_address.seller_address'))

@seller_address_app.route('/delete_seller_address/<address_id>')
def delete_seller_address(address_id):
    seller_id = session.get('SellerID')
    if not seller_id:
        flash("You must be logged in.")
        return redirect(url_for('seller_address.seller_address'))

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if address is used in any product
        cursor.execute("SELECT COUNT(*) FROM product WHERE AddressID = %s", (address_id,))
        count = cursor.fetchone()[0]

        if count > 0:
            # Address is in use, prevent deletion
            cursor.close()
            conn.close()
            return redirect(url_for('seller_address.seller_address', delete_error=1))
        else:
            # Safe to delete
            cursor.execute(
                "DELETE FROM seller_addresses WHERE AddressID = %s AND SellerID = %s",
                (address_id, seller_id)
            )
            conn.commit()
            cursor.close()
            conn.close()
            flash("Address deleted successfully!")
            return redirect(url_for('seller_address.seller_address'))

    except Exception as e:
        print(e)
        cursor.close()
        conn.close()
        flash("Something went wrong!")
        return redirect(url_for('seller_address.seller_address'))


@seller_address_app.route('/set_default_seller_address', methods=['POST'])
def set_default_address():
    seller_id = session.get('SellerID')
    if not seller_id:
        return {"success": False, "error": "Not logged in"}, 401

    data = request.get_json()
    address_id = data.get("address_id")
    if not address_id:
        return {"success": False, "error": "No address ID provided"}, 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Set all addresses of the seller to not default
        cursor.execute(
            "UPDATE seller_addresses SET IsDefault=0 WHERE SellerID=%s", (seller_id,)
        )
        # Set selected address as default
        cursor.execute(
            "UPDATE seller_addresses SET IsDefault=1 WHERE AddressID=%s AND SellerID=%s",
            (address_id, seller_id)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(e)
        return {"success": False, "error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

    return {"success": True}
