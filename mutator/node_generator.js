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

function generate_block_statement(node, scopeManager) {
    var currentScope = scopeManager.acquire(node);
    console.log(currentScope);
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
            generate_block_statement(node, scopeManager);
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
  
    mutate(ast, scopeManager);
    return escodegen.generate(ast);
}

var seed_file = process.argv[2];
var rf = require("fs");
var raw = rf.readFileSync(seed_file, "utf-8");

mutated_code = mutate_code(raw);

console.log(mutated_code);
