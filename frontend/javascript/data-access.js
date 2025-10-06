
export async function get_asteroid_names() {
    try {
        const response = await fetch('http://localhost:5000/get_asteroid_names');
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.log(error);
    }
}

export async function get_asteroid_data(name) {
    try {
        const response = await fetch(`http://localhost:5000/get_asteroid?name=${encodeURIComponent(name)}`);
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.log(error);
    }
}