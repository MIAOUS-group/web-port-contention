import plotly.graph_objects as go
import os
def plottest():
    for file in os.listdir('.'):
        if file[0:5] == 'data_':
            with open(file, "r") as f:
                filecontent = [int(k) for k in f.read().split("\t")[:-1]]
            fig = go.Figure([go.Bar(y=filecontent)])
            fig.update_yaxes(range=[0,2000])
            fig.show()

if __name__ == '__main__':
    plottest()
    # denStreamToBits(0)
    # for i in range(4):
    #     densityToBits(i)
