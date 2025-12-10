from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer
from flask import url_for
from app import app, mail  # Import app from app.py

# Function to generate the reset token
def generate_reset_token(email):
    s = URLSafeTimedSerializer(app.secret_key)  # You can directly import app from app.py
    return s.dumps(email, salt='password-reset') 

# Function to send reset email
def send_reset_email(user_email, reset_token, username):
    reset_url = url_for('reset.reset_password', token=reset_token, _external=True)  # Adjusted route name if needed

    msg = Message('Reset Your Password', recipients=[user_email])

    html_body = f"""
    <html>
        <body>
            <div style="text-align: center; font-family: Arial, sans-serif;">
                <h1 style="color: green;">AGRIMART</h1>
                <p><strong>Connecting you to Local Farmers</strong></p>
                <p>Hey, {username}</p>
                <p>Your AngkatAni password can be reset by clicking the link below. If you did not request a new password, please ignore this email.</p>
                <p><a href="{reset_url}" style="text-decoration: none; font-size: 16px; font-weight: bold; color: #007BFF;">Click this to reset your password</a></p>
            </div>
        </body>
    </html>
    """

    msg.html = html_body

    try:
        mail.send(msg)  # Sending the email via the mail object imported from app.py
    except Exception as e:
        print(f"Error sending email: {e}")
