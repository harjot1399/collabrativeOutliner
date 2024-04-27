window.addEventListener('load', function() {
    document.querySelector('h1').remove();

    loadOutlineData();
});

function loadOutlineData(){
    fetch('/outline/') 
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            const outlineItem = document.createElement('div');
            outlineItem.id = data.url
            outlineItem.className = "Root"
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.value = "Root";  
            textInput.className = 'text-content';
            textInput.addEventListener('input', function() {
                console.log(textInput.value)
                editItem(outlineItem, textInput.value);
            });
        
            outlineItem.appendChild(textInput);
            const addButton = document.createElement('button');
            addButton.textContent = 'Add'; 
            addButton.className= 'add-button'
            addButton.addEventListener('click', function() {
                const newItemText = prompt("Enter text for the new item:");
                if (newItemText) {
                    addNewItem(outlineItem, newItemText, 1);
                }
            });
            outlineItem.appendChild(addButton);
            document.body.appendChild(outlineItem);
        })
        .catch(error => {
            console.error('There has been a problem with your fetch operation:', error);
        });

}

function addNewItem(parentItem,text, depth){
    url = parentItem.id;
    url += "/"
    fetch(url, {
        method: 'POST',
        body: JSON.stringify({text}),
        headers: {
            'Content-Type': 'application/json' 
        },
    })
    .then(response => response.json()) 
    .then(data => {
        const url = data.url
        const text = data.text
        createNewElements(parentItem, text, url, depth) 
    
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function createNewElements(parentItem, text, url, depth){
    const outlineItem = document.createElement('div');
    outlineItem.id = url
    outlineItem.style.marginLeft = `${depth * 20}px`;
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = text; 
    textInput.className = 'text-content';
    textInput.addEventListener('input', function() {
        editItem(outlineItem, textInput.value);
    });
   
    outlineItem.appendChild(textInput);
    const addButton = document.createElement('button');
    addButton.textContent = 'Add'; 
    addButton.className = 'add-button'
    addButton.addEventListener('click', function() {
        const newItemText = prompt("Enter text for the new item:");
        if (newItemText) {
            addNewItem(outlineItem, newItemText, depth);
        }
    });
   
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-button';
    deleteButton.addEventListener('click' , function(){
        deleteItem(outlineItem)

    });
    

    outlineItem.appendChild(addButton);
    outlineItem.appendChild(deleteButton);
    parentItem.appendChild(outlineItem);
}

function deleteItem(item){
    url = item.id;
    url += "/"

    fetch(url, {
        method: 'DELETE',
    })
    .then(response => {
        if (response.status === 204) {
            console.log('Item deleted successfully');
            
            item.remove(); 
        } else {
            return response.json(); 
        }
    }).catch((error) => {
        console.error('Error:', error);
    });
}

function editItem(item, text){
    url = item.id;
    url += "/";
    fetch(url, {
        method: 'PUT',
        body: JSON.stringify({text}),
        headers: {
            'Content-Type': 'application/json' 
        },
    })
    .then(response => response.json())
    .then(data => {
        const textInput = item.querySelector('.text-content');
        textInput.value = data.text;
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

let lastFetchTime = new Date().toISOString();
function pollForUpdates() {
    
    fetch(`/updatedItems/?since=${lastFetchTime}`)
      .then(response => response.json())
      .then(data => {
        updateItems(data);
        lastFetchTime = new Date().toISOString(); 
      })
      .catch(error => console.error('Polling error:', error));
}

function updateItems(data) {
    Object.keys(data).forEach(url => {
        let operation = data[url]
        let item = document.getElementById(url)

        if (operation == 'DELETE'){
            item.remove()
        }else if (operation == 'PUT'){
            if (item){
                fetch(url)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok ' + response.statusText);
                        }
                        return response.json();
                    })
                    .then(data => {
                        const textInput = item.querySelector('.text-content');
                        textInput.value = data.text;

                    }

                    ).catch(error => {
                        console.error('There has been a problem with your fetch operation:', error);
                    });
                
            }
        }else if (operation == 'POST'){
            let segements = url.split('/');
            segements.pop()
            let parent = segements.join('/');
            parentItem = document.getElementById(parent)
            if (!item){
                if (parentItem){
                    console.log("Parent exits")
                    fetch(url)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok ' + response.statusText);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log(data)
                        createNewElements(parentItem,data.text,data.url,1);
                    }

                    ).catch(error => {
                        console.error('There has been a problem with your fetch operation:', error);
                    });
                }
            }

        }

        
    });
}

window.setInterval(pollForUpdates, 500);
