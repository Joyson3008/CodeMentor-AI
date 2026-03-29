from flask import Flask, jsonify, send_file
import mysql.connector
from flask_cors import CORS  # Enable Cross-Origin Resource Sharing

import pandas as pd
import os
import matplotlib
matplotlib.use('Agg')  # Use a non-GUI backend
import matplotlib.pyplot as plt
app = Flask(__name__)
CORS(app)  # Allow cross-origin requests


# Database connection
def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        port=3309,
        database="codementor ai"
    )


@app.route("/<int:student_id>")
def get_errors(student_id):
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        query = "SELECT * FROM progress_report WHERE student_id = %s"
        cursor.execute(query, (student_id,))
        results = cursor.fetchall()

        print(f"Query results for student_id {student_id}: {results}")  # Debug statement

        if not results:
            return jsonify({"error": "No data found for the given Student ID."}), 404

        return jsonify(results)

    except Exception as e:
        print(f"Error: {e}")  # Debug statement
        return jsonify({"error": f"Server error: {e}"}), 500
    finally:
        if connection.is_connected():
            connection.close()


@app.route("/visualize/<int:student_id>/histogram")
def visualize_histogram(student_id):
    try:
        connection = get_connection()
        query = "SELECT syntax_error, runtime_error, logic_error FROM progress_report WHERE student_id = %s"
        data = pd.read_sql(query, connection, params=(student_id,))

        if data.empty:
            return jsonify({"error": "No data found for visualization."}), 404

        # Summing error counts
        error_counts = {
            "Syntax Errors": data["syntax_error"].sum(),
            "Runtime Errors": data["runtime_error"].sum(),
            "Logic Errors": data["logic_error"].sum()
        }

        # Plotting the histogram
        plt.bar(error_counts.keys(), error_counts.values(), color=['#4CAF50', '#4682B4', '#FF9800'], edgecolor='black')
        plt.title("Count of Errors by Type", fontsize=16)
        plt.xlabel("Error Type", fontsize=12)
        plt.ylabel("Count of Errors", fontsize=12)

        image_path = f"histogram_{student_id}.png"
        plt.savefig(image_path)
        plt.close()

        return send_file(image_path, mimetype='image/png')

    except Exception as e:
        print(f"Error: {e}")  # Debug statement
        return jsonify({"error": f"Visualization error: {e}"}), 500
    finally:
        if connection.is_connected():
            connection.close()


@app.route("/visualize/<int:student_id>/bar")
def visualize_bar(student_id):
    try:
        connection = get_connection()
        query = "SELECT language, syntax_error, runtime_error, logic_error FROM progress_report WHERE student_id = %s"
        data = pd.read_sql(query, connection, params=(student_id,))

        if data.empty:
            return jsonify({"error": "No data found for visualization."}), 404

        # Summing errors by language
        error_totals = data.groupby("language")[["syntax_error", "runtime_error", "logic_error"]].sum()

        # Plotting the bar chart
        error_totals.plot(kind="bar", figsize=(10, 6), color=['#FF5733', '#33FF57', '#3357FF'])
        plt.title("Total Errors by Language")
        plt.xlabel("Programming Language")
        plt.ylabel("Total Error Count")
        plt.legend(["Syntax Error", "Runtime Error", "Logic Error"])

        image_path = f"bar_chart_{student_id}.png"
        plt.savefig(image_path)
        plt.close()

        return send_file(image_path, mimetype="image/png")

    except Exception as e:
        print(f"Error: {e}")  # Debug statement
        return jsonify({"error": f"Visualization error: {e}"}), 500
    finally:
        if connection.is_connected():
            connection.close()
            
            
@app.route("/visualize/<int:student_id>/pie")
def visualize_pie(student_id):
    try:
        connection = get_connection()
        query = "SELECT syntax_error, runtime_error, logic_error FROM progress_report WHERE student_id = %s"
        data = pd.read_sql(query, connection, params=(student_id,))

        if data.empty:
            return jsonify({"error": "No data found for visualization."}), 404

        error_counts = [data["syntax_error"].sum(), data["runtime_error"].sum(), data["logic_error"].sum()]
        labels = ["Syntax Errors", "Runtime Errors", "Logic Errors"]

        plt.figure(figsize=(6, 6))
        plt.pie(error_counts, labels=labels, autopct='%1.1f%%', colors=['#FF5733', '#33FF57', '#3357FF'])
        plt.title("Error Distribution")

        image_path = f"pie_chart_{student_id}.png"
        plt.savefig(image_path)
        plt.close()

        return send_file(image_path, mimetype='image/png')

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": f"Visualization error: {e}"}), 500
    finally:
        if connection.is_connected():
            connection.close()
            
if __name__ == "__main__":
    app.run(port=5000)
          