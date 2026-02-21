// Translate for example "-name" to [['name', 'DESC']]
export function getSort(value) {
    if (value === undefined) return undefined;
    else {
        let field;
        let direction;

        if (value.startsWith("-")) {
            direction = "DESC";
            // we remove the "-" from the string then we split it depending on if there's "_" or not in the string
            field = value.substring(1).split("_");
        } else {
            direction = "ASC";
            // same here, we split the string depending on if there's "_" or not in the string
            field = value.split("_");
        }

        // since field is now an array because of split, we push the direction at the end of it
        // Sequelize awaits an array containing all fields / subfields followed at the end by either DESC or ASC
        field.push(direction);

        return [field];
    }
}
