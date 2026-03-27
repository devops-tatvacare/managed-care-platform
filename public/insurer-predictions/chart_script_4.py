import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import json

# Try to load the CSV file first, if not available use the provided JSON data
try:
    df = pd.read_csv("state_diabetes_burden.csv")
except FileNotFoundError:
    # Use the provided JSON data
    data = {
        "states": [
            {"State": "Tamil Nadu", "ASPR_per_100k": 8299.55, "DALY_per_100k": 1893.11, "Prevalence_Increase_1990_2021_%": 0.78},
            {"State": "Goa", "ASPR_per_100k": 6675.33, "DALY_per_100k": 1650.0, "Prevalence_Increase_1990_2021_%": 1.12},
            {"State": "Karnataka", "ASPR_per_100k": 6663.54, "DALY_per_100k": 1580.0, "Prevalence_Increase_1990_2021_%": 0.95},
            {"State": "Punjab", "ASPR_per_100k": 5800.0, "DALY_per_100k": 1450.0, "Prevalence_Increase_1990_2021_%": 1.05},
            {"State": "Haryana", "ASPR_per_100k": 5650.0, "DALY_per_100k": 1380.0, "Prevalence_Increase_1990_2021_%": 1.09},
            {"State": "Uttar Pradesh", "ASPR_per_100k": 5200.0, "DALY_per_100k": 1250.0, "Prevalence_Increase_1990_2021_%": 0.65},
            {"State": "Kerala", "ASPR_per_100k": 4850.0, "DALY_per_100k": 1150.0, "Prevalence_Increase_1990_2021_%": 0.32},
            {"State": "Bihar", "ASPR_per_100k": 3200.0, "DALY_per_100k": 950.0, "Prevalence_Increase_1990_2021_%": 0.51}
        ]
    }
    df = pd.DataFrame(data["states"])

# Create the bubble chart using full ASPR values
fig = go.Figure()

fig.add_trace(go.Scatter(
    x=df['State'],
    y=df['ASPR_per_100k'],
    mode='markers+text',
    marker=dict(
        size=df['DALY_per_100k'] / 50,  # Scale bubble size appropriately
        color=df['Prevalence_Increase_1990_2021_%'],
        colorscale=[[0, '#2E8B57'], [0.5, '#D2BA4C'], [1, '#DB4545']],
        showscale=True,
        colorbar=dict(
            title=dict(text="Prev Inc %")
        ),
        line=dict(width=2, color='white'),
        sizemin=8
    ),
    text=df['State'],
    textposition='top center',
    textfont=dict(size=9, color='black'),
    hovertemplate=
    '<b>%{text}</b><br>' +
    'ASPR: %{y:.0f}<br>' +
    'DALY: %{customdata[0]:.0f}<br>' +
    'Prev Inc: %{marker.color:.2f}%' +
    '<extra></extra>',
    customdata=df[['DALY_per_100k']],
    name=""
))

fig.update_layout(
    title="Diabetes Burden by State",
    xaxis_title="State",
    yaxis_title="ASPR per 100k",
    showlegend=False,
    xaxis=dict(tickangle=45)
)

fig.update_traces(cliponaxis=False)

# Save the chart
fig.write_image("diabetes_burden_bubble_chart.png")
print("Chart saved as: diabetes_burden_bubble_chart.png")