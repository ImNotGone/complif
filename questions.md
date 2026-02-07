1. la informacion solo debe ser accesible si los usuarios estan logueados?
    - creo que se trata de informacion sensible asi q unicamente voy a permitir acceso a aquellos q tengan cuenta, sean viewer o admin
    - al haber agregado una guard global, esto significa que para los endpoints publicos hay q anotarlos manualmente
    
2. tax id deberia ser @unique?
    - no le puse unique porque nose como es el cuit / identificador fiscal x pais y quizas tenia colisiones
