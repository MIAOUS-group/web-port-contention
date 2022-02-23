#!/usr/bin/env python3
# -*- coding: utf-8 -*-
''' This module contains all the python components of PC-Detector.

It automates the test by using Selenium to manipulate the browser.
'''
from selenium import webdriver
from selenium.common.exceptions import JavascriptException, WebDriverException
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.chrome.options import Options as ChromeOptions

from selenium.webdriver.firefox.firefox_binary import FirefoxBinary

import plotly.graph_objects as go
import subprocess
import os
import time
import csv
import math
import json
import statistics
import sys
import argparse
import numpy as np
import instructions
import re
import cpuinfo


URL = "http://localhost:8000/PC_Detector/pc-detector.html"



#################################### METRICS ###################################
''' This section details the metrics we use to detect and evaluate port contention
caused by WebAssembly instructions.
We use two main metrics:
 - Error rate: The percentage of error if we were to blindly ditinguish between two distributions.
 - Cohen's d: a statistical metric to measure the distance between two distributions.
'''


def error_rate_threshold(low_dist, high_dist, threshold):
    ''' Compute the error rate for a given threshold.
    We suppose one distribution is on average higher than the other, and compute
    the rate of lower values superior to the threshold and higher values inferior to the theshold.

    Parameters:
    low_dist(list[int]): List of timings, supposedly on average lower than high_dist.
    high_dist(list[int]): List of timings, supposedly on average higher than low_dist.
    threshold(int): Given threshold to distinguish between the distributions.

    Returns:
    int: The error rate for the given threshold.

    '''
    error_count = 0
    for value in low_dist:
        if value > threshold:
            error_count+=1
    for value in high_dist:
        if value < threshold:
            error_count+=1
    return (error_count / (len(low_dist) + len(high_dist)))


    ''' For a given high and low distribution, computes the best (lower) error rate
    for a range of thresholds (comprised between the smallest and highest values).

    Parameters:
    low_dist(list[int]): List of timings, supposedly on average lower than high_dist.
    high_dist(list[int]): List of timings, supposedly on average higher than low_dist.
    step(int): Incremental value between two thresholds.

    Returns:
    int: The lowest error rate for the two distributions.
    '''
def best_ordered_error_rate(low_dist, high_dist, step):
    min_value = math.floor(min([min(low_dist), min(high_dist)]))
    max_value = math.ceil(max([max(low_dist), max(high_dist)]))
    best_error_rate = 1
    best_threshold = -1
    for threshold in np.arange(min_value, max_value, step):
        er = error_rate_threshold(low_dist, high_dist, threshold)
        if (er < best_error_rate):
            best_error_rate = er
            best_threshold = threshold
    return best_error_rate



def error_rate(dist1, dist2):
    ''' Compute the best error rate for two distributions.
    Basically switches high_dist and low_dist because we don't know before
    which is which.

    Parameters:
    dist1(list[int]): distribution of timings.
    dist2(list[int]): distribution of timings.

    Returns:
    int: The error rate (in percentage.)
    '''

    step = 0.01
    er = min([best_ordered_error_rate(dist1, dist2, step), best_ordered_error_rate(dist2, dist1, step)])
    return int(er*100)



def cohen_d(dist1, dist2):
    '''Computes Cohen's d (or effect size) of two distributions.

    Parameters:
    dist1(list[int]): distribution of timings.
    dist2(list[int]): distribution of timings.

    Returns:
    int: Cohen's d
    '''
    (dist1_n, dist2_n) = dist1,dist2
    return abs((statistics.mean(dist1_n) - statistics.mean(dist2_n)) / (math.sqrt((statistics.stdev(dist1_n) ** 2 + statistics.stdev(dist2_n) ** 2) / 2)))



def get_metrics(D1, D2):
    ''' Compute all metrics for two given distributions.

    Parameters:
    D1(list[int]): distribution of timings.
    D2(list[int]): distribution of timings.

    Returns:
    dict: Object containing metrics about the two distributions.
    '''
    er = error_rate(D1, D2)
    try:
        cohend =  cohen_d(D1,D2)
    except:
        cohend = 0
    return {
        'error_rate': er,
        # 'ratio': ratio,
        'cohen_d': cohend,
     }


##################################### TESTS ####################################

def get_driver(browser_s):
    ''' Create a driver instance and returns it.
    We use it to waste less time starting and closing the browser.

    Parameters:
    browser_s(string): The name of the browser. Either firefox or chrome

    Returns:
    selenium.webdriver: A handle to the browser
    '''
    if (browser_s == 'firefox'):
        options = FirefoxOptions()
        options.add_argument("-devtools") # Opening the console somehow makes things better
        driver = webdriver.Firefox(options=options)
    elif (browser == 'chrome'):
        options = ChromeOptions()
        options.add_argument("auto-open-devtools-for-tabs") # Opening the console somehow makes things better
        driver = webdriver.Chrome(options=options)
    driver.maximize_window()
    driver.set_script_timeout(10000000000) # Sometimes the computations are too long so we set a high timeout ot be sure
    driver.get(URL)
    return driver



def test_instruction_port(instruction, port, driver):
    '''Run test for an instruction, while creating contention or not on a port.

    Parameters:
    instruction(str): tested instruction.
    port(int): Port to spam. Can be 1, 5 or None for control experiment.
    driver(selenium.webdriver): A handle to the tested browser.

    Returns:
    list[int]: Timings of the experiment.
    '''
    if (port == 0):
        native_spam = subprocess.Popen(["./build/pcd_P0"]) # Don't forget to make first
    elif (port == 1):
        native_spam = subprocess.Popen(["./build/pcd_P1"])
    elif (port == 23):
        native_spam = subprocess.Popen(["./build/pcd_P23"])
    elif (port == 5):
        native_spam = subprocess.Popen(["./build/pcd_P5"])
    elif (port == 6):
        native_spam = subprocess.Popen(["./build/pcd_P6"])
    elif (port == 'stress'):
        native_spam = subprocess.Popen(["taskset", "-c", "0-3", "stress", "-c", "4"])
    time.sleep(1)
    try:
        if instruction in instructions.PUNOP: #Difference in quotes, maybe i should unify it.
            mean_timings = driver.execute_script("""return testInstruction({})""".format(instruction))
        else:
            mean_timings = driver.execute_script("""return testInstruction("{}")""".format(instruction))
    finally:
        if port == 'stress':
            subprocess.Popen(["pkill","stress"])
        elif port != None:
            native_spam.terminate() #Kill the native process

    return mean_timings



def test_instruction(instruction, driver):
    ''' Test all ports for an instruction and compute metrics.

    Parameters:
    instruction(string): Name of the tested instrucionts.
    driver(selenium.webdriver): A handle to the tested browser.

    Returns:
    dict: A dict containing all timings and metrics.
    '''
    results = {}
    results['instruction'] = instruction
    results['control'] = test_instruction_port(instruction, None, driver)
    results['p0'] = test_instruction_port(instruction, 0, driver)
    results['p1'] = test_instruction_port(instruction, 1, driver)
    results['p23'] = test_instruction_port(instruction, 23, driver)
    results['p5'] = test_instruction_port(instruction, 5, driver)
    results['p6'] = test_instruction_port(instruction, 6, driver)
    results['stress'] = test_instruction_port(instruction, 'stress', driver)
    results['metrics'] = get_metrics(results['p1'], results['p5'])
    return results



def pc_tester(browser='firefox', output_file = ""):
    ''' Main function of PC-Detector.
    It handles all the test for all instructions and output the result in a json file.

    Parameters:
    browser(string): The name of the browser. Either firefox or chrome.
    output_file(string): Name of the json output file. By default it contains the tested browser and cpu.
    '''
    results = {}
    cpu_re = re.search("i[0-9]-[0-9]{4}[A-Z]", cpuinfo.get_cpu_info()['brand_raw']) #Hope it works well i am bad at regex :(
    cpu_s = cpu_re.group()
    results['browser'] = browser
    results['cpu'] = cpu_s
    results['data'] = []
    counter = 1
    for instruction in instructions.ALLOP:
        print("{}/{} - {}%: Testing {}; ".format(counter,len(instructions.ALLOP), math.floor(counter/len(instructions.ALLOP)*100), instruction))
        driver = get_driver(browser)
        res_instr = test_instruction(instruction,driver)
        driver.close()
        results['data'].append(res_instr)
        counter+=1
    if output_file == "":
        output_file = "pcd_{}_{}.json".format(browser, cpu_s)
    with open(output_file, 'w') as file:
        json.dump(results, file)


################################ PLOT AND STATS ################################


def find_pc(json_file):
    ''' Compute and output stats for all instruction creating contention.
    First, you need to run the tests :)

    Parameters:
    json_file(string): Path to the output of the test function.
    '''
    with open(json_file, 'r') as input:
        data = json.load(input)
    for experiment in data['data']:
        instruction = experiment['instruction']
        p0_timings = experiment['p0']
        p1_timings = experiment['p1']
        p23_timings = experiment['p23']
        p5_timings = experiment['p5']
        p6_timings = experiment['p6']
        stats = get_metrics(p1_timings,p5_timings)
        if statistics.mean(p1_timings) >= statistics.mean(p5_timings):
            pc = "P1"
        else:
            pc = P5
        if stats['error_rate'] < 5:
            print("{}: Suspected contention: {} \t Error rate: {} \t Cohen's d: {}".format(instruction, pc,  stats['error_rate'], stats['cohen_d']))



def plot_hist(json_file):
    ''' Plot a histogram representing the timing distribution for the three
    experiences (P1, P5 and control) for each instruction.

    Parameters:
    json_file(string): Path to the output of the test function.
    '''
    timings = []
    with open(json_file, 'r') as input:
        data = json.load(input)
    for experiment in data['data']:
        blank_timings = experiment['control']
        p0_timings = experiment['p0']
        p1_timings = experiment['p1']
        p23_timings = experiment['p23']
        p5_timings = experiment['p5']
        p6_timings = experiment['p6']
        stress_timings = experiment['stress']

        stats = get_metrics(p1_timings,p5_timings)

        fig = go.Figure()
        fig.add_trace(go.Histogram(x=blank_timings, name = 'No contention timings', xbins=dict( # bins used for histogram
                                                                        size=0.05
                                                                    ),))
        fig.add_trace(go.Histogram(x=p0_timings, name = 'P0 contention timings',     xbins=dict( # bins used for histogram
                                                                        size=0.05
                                                                    ),))
        fig.add_trace(go.Histogram(x=p1_timings, name = 'P1 contention timings',     xbins=dict( # bins used for histogram
                                                                        size=0.05
                                                                    ),))
        fig.add_trace(go.Histogram(x=p23_timings, name = 'P23 contention timings',     xbins=dict( # bins used for histogram
                                                                        size=0.05
                                                                    ),))
        fig.add_trace(go.Histogram(x=p5_timings, name = 'P5 contention timings',     xbins=dict( # bins used for histogram
                                                                            size=0.05
                                                                        ),))
        fig.add_trace(go.Histogram(x=p6_timings, name = 'P6 contention timings',     xbins=dict( # bins used for histogram
                                                                            size=0.05
                                                                        ),))
        fig.add_trace(go.Histogram(x=stress_timings, name = 'Stress timings',     xbins=dict( # bins used for histogram
                                                                            size=0.05
                                                                        ),))
        title_text= "Instruction: {}\t Error rate: {} \t Cohen's d: {}".format(experiment['instruction'], stats['error_rate'], experiment['metrics']['cohen_d'])
        fig.update_layout(title_text = title_text)
        fig.show()


################################ MAIN AND ARGS #################################

def parse_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument('-b', '--browser', help=' Select evaluated browser. Can be firefox, chrome or safari. Default is firefox', type=str, default='firefox', choices = ['chrome', 'firefox', 'safari'])
    parser.add_argument('-p', '--plot', help='Plot all graphs in the output file. Default is false', action='store_true',default=False)
    parser.add_argument('-t', '--test', help='Test all supported instructions and outputs result in the output file. Default is false', action='store_true',default=False)
    parser.add_argument('-s', '--stats', help='Print stats about instructions causing port contention. Default is false', action='store_true',default=False)
    parser.add_argument('-o', '--output', help='Json output file, default is ./results.json',type = str, default = "")
    args = parser.parse_args()
    return args


if __name__ == '__main__':
    if sys.version_info < (3, 0):
        sys.stdout.write("Sorry, requires Python 3.x, not Python 2.x\n")
        sys.exit(1)
    args = parse_arguments()
    browser = args.browser
    if args.output != "":
        output_file = args.output
        print(output_file)
    else:
        cpu_re = re.search("i[0-9]-[0-9]{4}[A-Z]", cpuinfo.get_cpu_info()['brand_raw'])
        cpu_s = cpu_re.group()
        output_file = "pcd_{}_{}.json".format(args.browser, cpu_s)
    if args.test:
        pc_tester(browser, output_file)
    if args.plot:
        plot_hist(output_file)
    if args.stats:
        find_pc(output_file)
    if not (args.test or args.plot or args.stats):
        print("No action selected, use -t to run tests and/or -p to plot results")
