1. la informacion solo debe ser accesible si los usuarios estan logueados?
    - creo que se trata de informacion sensible asi q unicamente voy a permitir acceso a aquellos q tengan cuenta, sean viewer o admin
    - al haber agregado una guard global, esto significa que para los endpoints publicos hay q anotarlos manualmente
    
2. tax id deberia ser @unique?
    - puse el constraint de unique por taxid y country juntos
