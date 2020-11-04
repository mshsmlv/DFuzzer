var esprima = require('esprima');
var escope = require('escope');
var estraverse = require('estraverse');
var escodegen = require('escodegen');

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

function __get_node(ast, aimed_type, index) {
    var scopeManager = escope.analyze(ast);
        var res_nodes = []
        estraverse.traverse(ast, {
            enter: function (node, parent) {
                if (node.type == aimed_type) {
                    var variables = []
                    if (parent) {
                        var parent_scope =  scopeManager.acquire(parent);
                        if (parent_scope) {
                            variables = parent_scope.variables;
                        }                  
                    } 
                    res_nodes.push(
                    {
                        node: node,
                        variables: variables, 
                    })
                }
            },
            leave: function (node, parent) {
            }
        });
        if (!index) {
            index = Math.floor(Math.random() * res_nodes
            .length);
        };

        console.log("index:", index);
        return [res_nodes[index], ast];
}

function getNode(aimed_type) {
    while (true){ 
        var tree_file = "./data-set/basic/" + randomChoice(trees);
        var code = fs.readFileSync(tree_file, "utf-8");

        try {
            var ast = esprima.parse(code);
        } catch(e) {
            continue
        }
        console.log(tree_file);
        var [new_node, source_tree] = __get_node(ast, aimed_type);
        if (new_node) {
            return [new_node, source_tree];
        }
        continue;
         
    }   
}

function getSpecifiedNode(tree_file, node_index, aimed_type) {
    var code = fs.readFileSync(tree_file, "utf-8");
    var ast = esprima.parse(code);

    return __get_node(ast, aimed_type, node_index);
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
            console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~");

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
        
           // var [new_node, source_tree] = getSpecifiedNode("./data-set/basic/testMulOverflow.js", 0, node.type);
            
            var [new_node, source_tree] = getNode(node.type);
            // при вставке дерева нужно проходиться по декларациям функций и классов.
            // то есть если вызываем какую-то функцию, то ее декларацию в дерево тоже впихиваем.
            //
            
           
            var currunt_variables = [];
            var current_scope = scopeManager.acquire(parent);

            if (current_scope) currunt_variables = current_scope.variables;

            console.log(new_node);

            new_node_variables = new_node.variables;

            estraverse.traverse(new_node.node, {
                enter: function (node, parent) {
                    if (node.object) {
                        if (node.object.type == "Identifier") {
                            if (
                                !check_variable_existence(global_variables, node.object.name) &&
                                !check_variable_existence(currunt_variables, node.object.name) &&
                                !check_variable_existence(new_node_variables, node.object.name)
                                ) {
                                node.object.name = randomChoice(global_variables).name;
                            };
                        }
                    }
                    if (node.left) {
                        if (node.left.type == "Identifier") {
                            if (
                                !check_variable_existence(global_variables, node.left.name) &&
                                !check_variable_existence(currunt_variables, node.left.name) &&
                                !check_variable_existence(new_node_variables, node.left.name)
                                ) {
                                node.left.name = randomChoice(global_variables).name;
                            };
                        }
                    }
                    if (node.right) {
                        if (node.right.type == "Identifier") {
                            if (
                                !check_variable_existence(global_variables, node.right.name) &&
                                !check_variable_existence(currunt_variables, node.right.name) &&
                                !check_variable_existence(new_node_variables, node.right.name)
                                ) {
                                node.right.name = randomChoice(global_variables).name;
                            };
                        }
                    }
                },
                leave: function (node, parent) {}
            });

            console.log(escodegen.generate(new_node.node));
            return new_node.node;

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