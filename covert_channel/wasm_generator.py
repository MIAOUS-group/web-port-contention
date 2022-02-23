#!/usr/bin/env python3
# -*- coding: utf-8 -*-



''' This module contains tool to create wat files (WebAssembly Text format) used
in most tools of this project.
Keep in mind this only creates the file, not build them.
To build them, you can use the make tool.

All the created wat files are stored in the wasm folder.

'''
import argparse
import re
import os


SRCDIR = './wasm/'
OBJDIR = './build/'

################################ SPAM FUNCTIONS ################################




def create_ctz_spam(lines, output = SRCDIR + 'ctz_spam.wat'):
    ''' Creates a wat file repeatedly calling the i64.ctz instruction.
    This instruction can create contention on port 1 and is used in the covert channel
    to send bits.

    Parameters:
    lines(int): The number of instructions
    output(string): The name of the output file. Default is ./wasm/ctz_spam.wat
    '''
    with open(output, 'w') as file:
        file.write('(module\n')
        file.write('\t(func $ctz_spam (param $p i32)(result i32)\n')
        file.write('\t\t(local.get $p)\n')
        for _ in range(lines+1):
            file.write('\t\t(i32.ctz)\n')
        file.write('\t)\n')
        file.write('\t(export "ctz_spam" (func $ctz_spam))\n')
        file.write(')\n')




def create_rem_spam(lines, output = SRCDIR + 'rem_spam.wat'):
    ''' Creates a wat file repeatedly calling the i64.rem_u instruction.
    This instruction can create contention on port 1 and is used in the covert channel
    to receive bits.

    Parameters:
    lines(int): The number of instructions
    output(string): The name of the output file. Default is ./wasm/rem_spam.wat
    '''
    with open(output, 'w') as file:
        file.write('(module\n')
        file.write('\t(func $rem_spam (param $p i64)(result i64)\n')
        file.write('\t\t(local.get $p)\n')
        for _ in range(lines+1):
            file.write('\t\t(local.get $p)\n\t\t(i64.rem_u)\n')
        file.write('\t)\n')
        file.write('\t(export "rem_spam" (func $rem_spam))\n')
        file.write(')\n')




################################ TIME FUNCTIONS ################################
''' These functions create wat file to create contention on port 1, namely i64.ctz and i64.rem_u
These files are used both in the Covert Channel and the Artificial Example.
'''


def create_ctz_time(lines, output = SRCDIR + 'ctz_time.wat'):
    ''' Creates a wat file repeatedly calling the i64.ctz instruction and timing it with SharedArrayBuffer in web assembly.
    This instruction can create contention on port 1 and is used in the covert channel
    to send bits.

    Parameters:
    lines(int): The number of instructions
    output(string): The name of the output file. Default is ./wasm/ctz_time.wat
    '''
    with open(output, 'w') as file:
        file.write('(module\n')
        file.write('(import "env" "mem" (memory 2048 2048 shared))\n')
        file.write('\t(func $ctz_spam (param $p i64)(result i64)\n')
        file.write('\t(local $t0 i64)\n')
        file.write('\t(local $t1 i64)\n')
        file.write('\t(local.set $t0 (i64.load (i32.and (i32.const 0xffffffff) (i32.const 256))))\n')
        file.write('\t\t(local.get $p)\n')
        for _ in range(lines+1):
            file.write('\t\t(i64.ctz)\n')
        file.write('\t(local.set $t1 (i64.load (i32.and (i32.const 0xffffffff) (i32.const 256))))\n')
        file.write('\t(i64.sub (local.get $t1) (local.get $t0))\n')
        file.write('\t return)\n')
        file.write('\t(export "ctz_spam" (func $ctz_spam))\n')
        file.write(')\n')




def create_rem_time(lines, output = SRCDIR + 'rem_time.wat'):
    ''' Creates a wat file repeatedly calling the i64.rem_u instruction and timing it with SharedArrayBuffer in web assembly.
    This instruction can create contention on port 1 and is used in the covert channel
    to receive bits.

    Parameters:
    lines(int): The number of instructions
    output(string): The name of the output file. Default is ./wasm/rem_time.wat
    '''
    with open(output, 'w') as file:
        file.write('(module\n')
        file.write('(import "env" "mem" (memory 2048 2048 shared))\n')
        file.write('\t(func $rem_spam (param $p i64)(result i64)\n')
        file.write('\t(local $t0 i64)\n')
        file.write('\t(local $t1 i64)\n')
        file.write('\t(local.set $t0 (i64.load (i32.and (i32.const 0xffffffff) (i32.const 256))))\n')
        file.write('\t\t(local.get $p)\n')
        for _ in range(lines+1):
            file.write('\t\t(local.get $p)\n\t\t(i64.rem_u)\n')
        file.write('\t(local.set $t1 (i64.load (i32.and (i32.const 0xffffffff) (i32.const 256))))\n')
        file.write('\t(i64.sub (local.get $t1) (local.get $t0))\n')
        file.write('\t return)\n')
        file.write('\t(export "rem_spam" (func $rem_spam))\n')
        file.write(')\n')


##################################### MAIN #####################################

def wasm_generator(lines = 1000, ctz = False, rem = False, pcd = False):
    if not os.path.isdir("./wasm"):
        os.mkdir("./wasm")
    if (ctz):
        if lines == -1:
            create_ctz_spam(1000)
            create_ctz_time(1000)
        else:
            create_ctz_spam(lines)
            create_ctz_time(lines)
    if (rem):
        if lines == -1:
            create_rem_spam(500)
            create_rem_time(500)
        else:
            create_rem_spam(lines)
            create_rem_time(lines)



def parse_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument('-l', '--lines', help='Number of CTZ lines in the wat file. Default is 500 for rem and 1000 for ctz', type=int, default = -1)
    parser.add_argument('-r', '--rem', help='Generate spam and time functions for i64.rem_u', action='store_true',default=False)
    parser.add_argument('-c', '--ctz', help='Generate spam and timed functions with i64.ctz', action='store_true',default=False)
    args = parser.parse_args()
    return args


if __name__ == '__main__':
    args = parse_arguments()
    if args.lines != -1:
        lines = args.lines
        print("Creating wat file with {} CTZ/REM_U instructions.".format(lines))
    else:
        print("Creating wat file with 1000 CTZ instructions and 500 rem. This is the default, use -l flag to change")
    if not (args.ctz or args.rem):
        print("Creating ALL the files")
        wasm_generator(args.lines, ctz = True, rem = True)
    else:
        wasm_generator(args.lines, ctz = args.ctz, rem = args.rem)
