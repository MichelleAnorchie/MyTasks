
from database import get_db_connection

try:
    connection = get_db_connection()

    if connection.is_connected():
        print("SUCCESS! Connected to MySQL.")
        print("Database: mytasks_db")

    connection.close()

except Exception as error:
    print("CONNECTION FAILED!")
    print(error)
