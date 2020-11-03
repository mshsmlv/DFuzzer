var esprima = require('esprima');
var escope = require('escope');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var esquery = require('esquery')


// https://esprima.readthedocs.io/en/latest/syntax-tree-format.html - вся инфа по возможным нодам

let binary_operator = ['+','-','*','/','%','**','&','|','^','<<','>>','>>>']; // Math operator
let binary_condition = ['==','!=','<','<=','>','>=','===','!==','instanceof','in']; // condition operator
let assign_operator = ['+=','-=','*=','**=','/=','%=','&=','^=','|=','<<=','>>=','>>>=','='];
let boolean_value = ['false','true'];
let unary_operator = ['~','-','!','++','--','+','']; // '...' 'typeof'
let update_operator = ['++','--'];
let logical_operator = ['&&','||'];

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

//./data-set/basic/testincops.js 0
// ./data-set/basic/doMath.js 0
// ./data-set/basic/testMulOverflow.js 0
// ./data-set/basic/testSwitchString.js 1

// TODO еще применимость этого дерева нужно в контекст прифигачить.
// типо если в блоке continue то его нельзя пихать.
// то есть замутить контексты.

function getNode(aimed_type) {
    while (true){ 
        var tree_file = "./data-set/basic/" + randomChoice(trees);
        var code = fs.readFileSync(tree_file, "utf-8");

        try {
            var ast = esprima.parse(code);
        } catch(e) {
            continue
        }
        
        nodes = esquery.query(ast, aimed_type)
        if (nodes.length == 0) {
            continue
        }
        random_index = Math.floor(Math.random() * nodes.length);
        console.log(tree_file, random_index);
        return [nodes[random_index], ast];
    }   
}

function getSpecifiedNode(tree_file, node_index, aimed_type) {
    var code = fs.readFileSync(tree_file, "utf-8");
    var ast = esprima.parse(code);

    var scopeManager = escope.analyze(ast);
    var global_variables = scopeManager.acquire(ast).variables;
    console.log(global_variables);
    console.log(escodegen.generate(ast));

    estraverse.traverse(ast, {
        enter: function (node, parent) {
                console.log("~~~~~~~~~~~~~~~~~~~~~~~~~");
                console.log(node)
                console.log("\n\n\nVariables: ")
                console.log(scopeManager.acquire(node));

        },
        leave: function (node, parent) {
        }
    });

    nodes = esquery.query(ast, aimed_type);
    return [nodes[node_index], ast];
}

function check_variable_existence(var_array, varname) {
    for(var i = 0; i < var_array.length; i++) {
        if (var_array[i].name == varname) {
            return true;
        }
    }
    return false;
}

function change_blocks(ast, scopeManager) {
    var global_variables = scopeManager.acquire(ast).variables;

    estraverse.replace(ast, {
        enter: function (node, parent) {
            switch (node.type) {
                case "FunctionDeclaration":
                case  "ReturnStatement":
                case  "VariableDeclaration":
                case  "Program":
                case  "ClassDeclaration":
                case  "Literal":
                case  "Identifier":
                case  "VariableDeclarator": return;
            }

            switch (Math.random()%2) {
                case 0: return
                case 1: // generate
            }
        
            var [new_node, source_tree] = getSpecifiedNode("./data-set/basic/testMulOverflow.js", 0, node.type);
            
            

             // var [new_node, source_tree] = getNode(node.type);
            // при вставке дерева нужно проходиться по декларациям функций и классов.
            // то есть если вызываем какую-то функцию, то ее декларацию в дерево тоже впихиваем.
            //
            
           
            var currunt_variables = [];
            var current_scope = scopeManager.acquire(parent);

            if (current_scope) {
                currunt_variables = current_scope.variables;
            }

            var scopeManagerNewNode = escope.analyze(source_tree);
            var new_node_variables = scopeManagerNewNode.acquire(new_node);
            console.log(new_node_variables);

            estraverse.traverse(new_node, {
                enter: function (node, parent) {
                    if (node.object) {
                        if (node.object.type == "Identifier") {
                            if (!check_variable_existence(global_variables, node.object.name)) {
                                node.object.name = randomChoice(global_variables).name;
                            };
                        }
                    }
                    if (node.left) {
                        if (node.left.type == "Identifier") {
                            if (!check_variable_existence(global_variables, node.left.name)) {
                                node.left.name = randomChoice(global_variables).name;
                            };
                        }
                    }
                    if (node.right) {
                        if (node.right.type == "Identifier") {
                            if (!check_variable_existence(global_variables, node.right.name)) {
                                node.right.name = randomChoice(global_variables).name;
                            };
                        }

                    }
                },
                leave: function (node, parent) {}
            });

            console.log(escodegen.generate(new_node));
            process.exit(0);
            return new_node;

        }
    })
}

function mutate(ast, scopeManager) {
    estraverse.traverse(ast, {
        enter: function (node, parent) {
            if (node.type == 'BinaryExpression') {
                node.operator = randomChoice(binary_operator);
            }
            if (node.type == 'LogicalExpression') {
                node.operator = randomChoice(logical_operator);
            }
            if (node.type == 'AssignmentExpression') {
                node.operator = randomChoice(assign_operator);
            }
            if (node.type == 'UnaryExpression') {
                node.operator = randomChoice(unary_operator);
            }
            if (node.type == 'UpdateExpression') {
                node.operator = randomChoice(update_operator);
            }
        },
        leave: function (node, parent) {
            if (node.type == 'VariableDeclarator')
              console.log(node.id.name);
        }
    });
};

module.exports = {
    mutate_code: mutate_code,
};

function mutate_code(code) {
    var ast = esprima.parse(code);
    var scopeManager = escope.analyze(ast);
  
    change_blocks(ast, scopeManager);
    return escodegen.generate(ast);
}

var fs = require("fs");
data_set_dir = "./data-set/basic"
var trees = fs.readdirSync(data_set_dir);

var seed_file = process.argv[2];
var raw = fs.readFileSync(seed_file, "utf-8");
mutated_code = mutate_code(raw);

console.log("========MUTATED CODE ============");
console.log(mutated_code);