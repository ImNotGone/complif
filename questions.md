1. la informacion solo debe ser accesible si los usuarios estan logueados?
    - creo que se trata de informacion sensible asi q unicamente voy a permitir acceso a aquellos q tengan cuenta, sean viewer o admin
    - al haber agregado una guard global, esto significa que para los endpoints publicos hay q anotarlos manualmente
    
2. tax id deberia ser @unique?
    - puse el constraint de unique por taxid y country juntos

3. la task menciona un enpoint para calcular riesgo, me parece mas logico que el riesgo se calcule automaticamente en cada paso
    - agregue el enpoint para hacer trigger de un calculo manual pero hice que el riesgo se calcule siempre q sea relevante
