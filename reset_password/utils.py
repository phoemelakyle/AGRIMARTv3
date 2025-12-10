import logging
from itsdangerous import URLSafeTimedSerializer
from flask_mail import Message
from flask import url_for, current_app

logger = logging.getLogger(__name__)


def generate_reset_token(email):
    s = URLSafeTimedSerializer(current_app.secret_key)
    return s.dumps(email, salt='password-reset')


def send_reset_email(user_email, username, token):
    reset_url = url_for('reset.reset_password', token=token, _external=True)

    msg = Message('Reset Your Password', recipients=[user_email])
    msg.html = f"""
    <html>
        <body>
            <div style="text-align: center; font-family: Arial, sans-serif;">
                <h1 style="color: green;">AGRIMART</h1>
                <p><strong>Connecting you to Local Farmers</strong></p>
                <p>Hey, {username}</p>
                <p>Your AgriMart password can be reset by clicking the link below. If you did not request a new password, please ignore this email.</p>
                <p><a href="{reset_url}" style="text-decoration: none; font-size: 16px; font-weight: bold; color: #007BFF;">Click this to reset your password</a></p>
            </div>
        </body>
    </html>
    """

    mail = current_app.extensions.get('mail')
    if mail is None:
        logger.error('Mail extension is not initialized when sending reset email')
        return False

    try:
        mail.send(msg)
        return True
    except Exception as exc:
        current_app.logger.exception('Failed to send reset email')
        return False
