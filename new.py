from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def opening_page():
    return render_template('openingPage2.html')  # Opening page 2 shown at root URL

@app.route('/home')
def home_page():
    return render_template('homePage.html')  # Home page shown at /home URL

@app.route('/homePage.html')
def home_page_html():
    return render_template('homePage.html')  # Home page also shown at /homePage.html URL

if __name__ == '__main__':
    app.run(debug=True)
