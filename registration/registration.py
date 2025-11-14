from flask import Blueprint, render_template, request, redirect, flash
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash  # Import from werkzeug
import os

registration_app = Blueprint('registration', __name__)


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


def is_username_unique(table_name, username):
    conn = get_db_connection()
    cursor = conn.cursor()


    sql_query = f"SELECT Username FROM {table_name} WHERE Username = %s"
    cursor.execute(sql_query, (username,))


    existing_username = cursor.fetchone()
    cursor.close()
    conn.close()


    return existing_username is None


class User:
    def __init__(self, name, email, address, phone_number, username, password):
        self.name = name
        self.email = email
        self.address = address
        self.phone_number = phone_number
        self.username = username
        self.password = self.hash_password(password)


    def hash_password(self, password):
        # Use werkzeug's generate_password_hash instead of bcrypt
        hashed_password = generate_password_hash(password)
        return hashed_password


    def insert_into_database(self, table_name, custom_prefix):
        conn = get_db_connection()
        cursor = conn.cursor()


        if not is_username_unique(table_name, self.username):
            cursor.close()
            conn.close()
            return "Username already exists. Please choose a different username."


        cursor.execute(f"SELECT MAX({table_name}ID) FROM {table_name}")
        latest_id = cursor.fetchone()[0]


        if latest_id is not None:
            numeric_part = int(latest_id[2:])
            new_numeric_part = numeric_part + 1
        else:
            new_numeric_part = 1000


        user_id = f"{custom_prefix}{new_numeric_part}"


        sql_query = f"INSERT INTO {table_name} ({table_name}ID, Name, Email, Address, Phone_Number, Username, Password) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        values = (user_id, self.name, self.email, self.address, self.phone_number, self.username, self.password)


        try:
            cursor.execute(sql_query, values)
            conn.commit()
            cursor.close()
            conn.close()
        except mysql.connector.IntegrityError as e:
            conn.rollback()
            cursor.close()
            conn.close()
            return "Username already exists. Please choose a different username."


class Buyer(User):
    def insert_into_database(self):
        return super().insert_into_database("buyer", "BY")


class Seller(User):
    def insert_into_database(self):
        return super().insert_into_database("seller", "SL")


@registration_app.route('/select_role', methods=['GET', 'POST'])
def select_role():
    if request.method == 'POST':
        user_type = request.form['userType']
        if user_type == 'buyer':
            return redirect("/register/buyer")
        elif user_type == 'seller':
            return redirect("/register/seller")
        else:
            return "Invalid user type"


    return render_template("select_role.html")


@registration_app.route('/register/buyer', methods=['GET', 'POST'])
def register_buyer():
    error = None  
    if request.method == 'POST':
        name = request.form['Name']
        email = request.form['Email']
        address = request.form['Address']
        phone_number = request.form['Phone_Number']
        username = request.form['Username']
        password = request.form['Password']


        if not is_username_unique("buyer", username) or not is_username_unique("seller", username):
            error = "Username already exists. Please choose a different username."
        else:
            user = Buyer(name, email, address, phone_number, username, password)
            result = user.insert_into_database()


            if isinstance(result, str):
                error = result


        if error:
            return render_template("buyer_registration.html", error=error)


        return redirect("/login")


    return render_template("buyer_registration.html", error=error)


@registration_app.route('/register/seller', methods=['GET', 'POST'])
def register_seller():
    error = None  
    if request.method == 'POST':
        name = request.form['Name']
        email = request.form['Email']
        address = request.form['Address']
        phone_number = request.form['Phone_Number']
        username = request.form['Username']
        password = request.form['Password']


        if not is_username_unique("buyer", username) or not is_username_unique("seller", username):
            error = "Username already exists. Please choose a different username."
        else:
            user = Seller(name, email, address, phone_number, username, password)
            result = user.insert_into_database()


            if isinstance(result, str):
                error = result


        if error:
            return render_template("seller_registration.html", error=error)


        return redirect("/login")
   
    return render_template("seller_registration.html", error=error)



