
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import get_db_connection

# Create the Flask application
app = Flask(__name__)

# Allow requests from our mobile app
CORS(app)


# HOME ROUTE
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Welcome to the MyTasks API!"
    })


# GET ALL TASKS
@app.route("/tasks", methods=["GET"])
def get_tasks():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT * FROM tasks ORDER BY created_at DESC")
    tasks = cursor.fetchall()

    # Convert database date and time values into strings
    for task in tasks:
        if task["due_date"] is not None:
            task["due_date"] = task["due_date"].isoformat()

        if task["due_time"] is not None:
            total_seconds = int(task["due_time"].total_seconds())

            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60

            task["due_time"] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    cursor.close()
    connection.close()

    return jsonify(tasks)


# ADD A NEW TASK
@app.route("/tasks", methods=["POST"])
def add_task():
    data = request.get_json()

    title = data.get("title")
    priority = data.get("priority", "medium")
    due_date = data.get("due_date")
    due_time = data.get("due_time")

    if not title or not title.strip():
        return jsonify({"error": "Task title is required"}), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    query = """
        INSERT INTO tasks (title, priority, due_date, due_time)
        VALUES (%s, %s, %s, %s)
    """

    cursor.execute(
        query,
        (title.strip(), priority, due_date or None, due_time or None)
    )

    connection.commit()
    task_id = cursor.lastrowid

    cursor.close()
    connection.close()

    return jsonify({
        "message": "Task added successfully!",
        "id": task_id
    }), 201


# UPDATE AN EXISTING TASK
@app.route("/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    data = request.get_json()

    connection = get_db_connection()
    cursor = connection.cursor()

    # Check whether the task exists
    cursor.execute(
        "SELECT id FROM tasks WHERE id = %s",
        (task_id,)
    )

    task = cursor.fetchone()

    if task is None:
        cursor.close()
        connection.close()
        return jsonify({"error": "Task not found"}), 404

    # Update only the fields provided
    allowed_fields = ["title", "is_completed", "priority", "due_date", "due_time"]

    updates = {
        key: data[key]
        for key in allowed_fields
        if key in data
    }

    if not updates:
        cursor.close()
        connection.close()
        return jsonify({"error": "No fields to update"}), 400

    if "title" in updates:
        if not isinstance(updates["title"], str) or not updates["title"].strip():
            cursor.close()
            connection.close()
            return jsonify({"error": "Task title cannot be empty"}), 400
        updates["title"] = updates["title"].strip()

    if "priority" in updates:
        if updates["priority"] not in ["low", "medium", "high"]:
            cursor.close()
            connection.close()
            return jsonify({"error": "Invalid priority"}), 400

    # Build and execute the update query
    set_clause = ", ".join(
        f"{field} = %s" for field in updates
    )

    values = list(updates.values())
    values.append(task_id)

    query = f"UPDATE tasks SET {set_clause} WHERE id = %s"

    cursor.execute(query, values)
    connection.commit()

    cursor.close()
    connection.close()

    return jsonify({
        "message": "Task updated successfully!",
        "id": task_id
    })






# DELETE A TASK
@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    # Check whether the task exists
    cursor.execute(
        "SELECT id FROM tasks WHERE id = %s",
        (task_id,)
    )

    task = cursor.fetchone()

    if task is None:
        cursor.close()
        connection.close()
        return jsonify({"error": "Task not found"}), 404

    # Delete the task
    cursor.execute(
        "DELETE FROM tasks WHERE id = %s",
        (task_id,)
    )

    connection.commit()

    cursor.close()
    connection.close()

    return jsonify({
        "message": "Task deleted successfully!",
        "id": task_id
    })



# RUN THE SERVER
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )