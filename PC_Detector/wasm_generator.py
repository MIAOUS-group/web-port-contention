#!/usr/bin/env python3
# -*- coding: utf-8 -*-



''' This module contains tool to create wat files (WebAssembly Text format) used
in most tools of this project.
Keep in mind this only creates the file, not build them.
To build them, you can use the make tool.

All the created wat files are stored in the wasm folder.

'''
import instructions
import argparse
import re
import os

SRCDIR = './wasm/'
OBJDIR = './build/'

################################## PC-DETECTOR #################################
''' These functions create wat files used for the PC-Detector.
For each instruction, it creates a wat file, repeatedly calling the instruction.
We differentiate different types of instructions:
 - Unary operator (UNOP): An instruction taking a single argument and outputing a single value, e.g. i64.ctz.
 - Binary operator (UNOP): An instruction taking 2 arguments and outputing a single value, e.g. i64.add.
 - Paired Operator (PUNOP): A pair of UNOP with complementary types, allowing to alternately call them.
 - Memory Operator (MEMOP): An instruction accessing the wasm memory.
'''


def unop_spam(instruction, lines):
    ''' Creates a string containing the code repeatedly calling a UNOP instruction.

    Parameters:
    instruction(str): Name of the UNOP.
    lines(int): The number of instructions

    Returns:
    string: The code to dump in the wat file.
    '''
    type = instruction[:3]
    code = ""
    code+= '(module\n'
    code+= "\t(func $spam (param $p {})(result {})\n".format(type, type)
    code+= '\t\t(local.get $p)\n'
    for _ in range(lines+1):
        code+= "\t\t({})\n".format(instruction)
    code+= '\t)\n'
    code+= """\t(export "spam" (func $spam))\n"""
    code+= ')\n'
    return code



def binop_spam(instruction, lines):
    ''' Creates a string containing the code repeatedly calling a BINOP instruction.

    Parameters:
    instruction(str): Name of the BINOP.
    lines(int): The number of instructions

    Returns:
    string: The code to dump in the wat file.
    '''
    type = instruction[:3]
    code = ""
    code+= '(module\n'
    code+= "\t(func $spam (param $p {})(result {})\n".format(type, type)
    code+= '\t\t(local.get $p)\n'
    for _ in range(lines+1):
        code += "\t\t(local.get $p)\n\t\t({})\n".format(instruction)
    code+= '\t)\n'
    code+= """\t(export "spam" (func $spam))\n"""
    code+= ')\n'
    return code




def pair_spam(instruction, lines):
    ''' Creates a string containing the code repeatedly calling PUNOP instructions.

    Parameters:
    instruction(str): Name of the PUNOP.
    lines(int): The number of pair of instructions

    Returns:
    string: The code to dump in the wat file.
    '''
    type = instruction[1][:3]
    code = ""
    code+= '(module\n'
    code+= "\t(func $spam (param $p {})(result {})\n".format(type, type)
    code+= '\t\t(local.get $p)\n'
    for _ in range(lines+1):
        code += "\t\t({})\n\t\t({})\n".format(instruction[0],instruction[1])
    code+= '\t)\n'
    code+= """\t(export "spam" (func $spam))\n"""
    code+= ')\n'
    return code



def store_spam(instruction, lines):
    ''' Creates a string containing the code repeatedly calling store (MEMOP) instructions.

    Parameters:
    instruction(str): Name of the MEMOP.
    lines(int): The number of instructions

    Returns:
    string: The code to dump in the wat file.
    '''
    type = instruction[:3]
    code = ""
    code += "(module\n"
    code += """\t(import "env" "mem" (memory 2048 2048))\n"""
    code += "\t(func $spam (param $p {})\n".format(type, type)
    for _ in range(lines+1):
        code += "\t\t({} (i32.const 0) (local.get $p))\n".format(instruction)
    code += "\t)\n"
    code += """\t(export "spam" (func $spam))\n"""
    code += ")"
    return code

def parse_vshape(vshape):
    vshape_re = re.search("([if][0-9]{1,2})x([0-9]{1,2})", vshape)
    num_type = vshape_re.group(1)
    param_count = vshape_re.group(2)
    return (num_type, param_count)

def vunop_spam(instruction, lines, binop=False):
    ''' Creates a string containing the code repeatedly calling a vectorial instruction.

    Parameters:
    instruction(str): Name of the VUNOP.
    lines(int): The number of instructions
    binop(bool): Set to true if instruction requires two parameters.

    Returns:
    string: The code to dump in the wat file.
    '''
    if instruction[0] == 'v':
        type = instruction[:4]
        type = "i64x2"
        param_type = "i64"
        num_type = "i64"
        param_count = "2"
        param = ' '.join(["(param $p{} {})".format(k, param_type) for k in range(int(param_count))])
    else:
        type = instruction[:5]
        (num_type, param_count) = parse_vshape(type)
        if (num_type in ['i16','i8']):
            param_type = "i32"
        else:
            param_type = num_type
        param = ' '.join(["(param $p{} {})".format(k, param_type) for k in range(int(param_count))])
    code = ""
    code+= '(module\n'
    code+= "\t(func $spam {} (result {})\n".format(param, param_type)
    code+= "\t\t(local $v v128)\n"
    code+= "\t\t(v128.const {} {})\n".format(type, ' '.join(["0" for _ in range(int(param_count))]))
    for lane in range(int(param_count)):
        code+="\t\t(local.get $p{})\n".format(lane)
        code+="\t\t({}.replace_lane {})\n".format(type,lane)
    code+= "\t\t(local.set $v)\n"
    code+= "\t\t(local.get $v)\n"
    for _ in range(lines):
        if binop:
            code+= "\t\t(local.get $v)\n"
        code+= "\t\t({})\n".format(instruction)
    if (num_type in ['i16','i8']):
        code+= "\t\t({}.extract_lane_s 0)\n".format(type)
    else:
        code+= "\t\t({}.extract_lane 0)\n".format(type)

    code+= '\t)\n'
    code+= """\t(export "spam" (func $spam))\n"""
    code+= ')\n'
    return code


def create_file(code, path):
    ''' Dump the WebAssembly text code to a wat file.

    Parameters:
    code(string):The WebAssembly Text code
    path(string): Path to the output file
    '''
    with open(path, 'w') as output:
        output.write(code)



def create_spam_files(lines):
    ''' Create all wat files for instructions listed in instructions.py

    Parameters:
    lines(int): The number of instructions

    '''
    for instruction in instructions.UNOP:
        output = "{}{}_spam.wat".format(SRCDIR, instruction)
        code = unop_spam(instruction, lines)
        create_file(code, output)
    for instruction in instructions.BINOP:
        output = "{}{}_spam.wat".format(SRCDIR, instruction)
        code = binop_spam(instruction, lines)
        create_file(code, output)
    for instruction in instructions.PUNOP:
        output = "{}{}_{}_spam.wat".format(SRCDIR, instruction[0], instruction[1])
        code = pair_spam(instruction, lines)
        create_file(code, output)
    # for instruction in instructions.STOREOP:
    #     output = "{}{}_spam.wat".format(SRCDIR, instruction)
    #     code = store_spam(instruction, lines)
    #     create_file(code, output)
    for instruction in instructions.VUNOP:
        output = "{}{}_spam.wat".format(SRCDIR, instruction)
        code = vunop_spam(instruction, lines)
        create_file(code, output)
    for instruction in instructions.VBINOP:
        output = "{}{}_spam.wat".format(SRCDIR, instruction)
        code = vunop_spam(instruction, lines, True)
        create_file(code, output)
    for instruction in instructions.VRELOP:
        output = "{}{}_spam.wat".format(SRCDIR, instruction)
        code = vunop_spam(instruction, lines, True)
        create_file(code, output)



##################################### MAIN #####################################

def wasm_generator(lines = 1000000,):
    if not os.path.isdir("./wasm"):
        os.mkdir("./wasm")
    create_spam_files(lines)


def parse_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument('-l', '--lines', help='Number of wasm lines in the wat file. Default is 1,000,000', type=int)
    args = parser.parse_args()
    return args


if __name__ == '__main__':
    args = parse_arguments()
    if args.lines:
        lines = args.lines
        print("Creating wat file with {} instructions.".format(lines))
    else:
        lines = 1000000
        print("Creating wat file with {} instructions. This is the default, use -l flag to change".format(lines))
    wasm_generator(lines)
