
async function get_asteroid_names() {
    try {
        const response = await fetch('http://localhost:5000/get_asteroid_names');
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.log(error);
    }
}

async function get_asteroid_data(name) {
    try {
        const response = await fetch(`http://localhost:5000/get_asteroid?name=${encodeURIComponent(name)}`);
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.log(error);
    }
}

export default function loadDropdown() {
    const list = get_asteroid_names();
    console.log(list);
    const dropdownElement = document.getElementById('asteroids-select');

    list.array.forEach(element => {
        let item = document.createElement('option');
        item.value = element;
        dropdownElement.appendChild(item);
    });
}