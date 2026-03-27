import pandas as pd
import plotly.graph_objects as go
import numpy as np

# Create dataframe from the provided data
risk_data = [
    {"Risk_Level": "Low Risk", "Diabetes_Prevalence_%": 5.2, "Patient_Count": 12500, "GDM_Risk_%": 8.5},
    {"Risk_Level": "Medium Risk", "Diabetes_Prevalence_%": 12.8, "Patient_Count": 15800, "GDM_Risk_%": 18.3},
    {"Risk_Level": "High Risk", "Diabetes_Prevalence_%": 24.5, "Patient_Count": 8200, "GDM_Risk_%": 35.7},
    {"Risk_Level": "Very High Risk", "Diabetes_Prevalence_%": 45.2, "Patient_Count": 3500, "GDM_Risk_%": 52.1}
]

df = pd.DataFrame(risk_data)

# Scale patient count to thousands
df['Patient_Count_k'] = df['Patient_Count'] / 1000

# Define risk levels and metrics with abbreviated labels (under 15 chars)
risk_levels = ['Low Risk', 'Medium Risk', 'High Risk', 'Very High Risk']
metrics = ['Diabetes %', 'GDM Risk %', 'Patients (k)']

# Create matrix for heatmap
heatmap_data = []
text_data = []

for risk in risk_levels:
    risk_row = df[df['Risk_Level'] == risk].iloc[0]
    row_data = [
        risk_row['Diabetes_Prevalence_%'],
        risk_row['GDM_Risk_%'], 
        risk_row['Patient_Count_k']
    ]
    text_row = [
        f"{risk_row['Diabetes_Prevalence_%']:.1f}%",
        f"{risk_row['GDM_Risk_%']:.1f}%",
        f"{risk_row['Patient_Count_k']:.1f}k"
    ]
    heatmap_data.append(row_data)
    text_data.append(text_row)

# Create heatmap
fig = go.Figure(data=go.Heatmap(
    z=heatmap_data,
    x=metrics,
    y=risk_levels,
    colorscale='Reds',  # Darker colors for higher risk values
    showscale=True,
    text=text_data,
    texttemplate="%{text}",
    textfont={"size": 12},
    hovertemplate='%{y}<br>%{x}: %{text}<extra></extra>',
    colorbar=dict(title="Value")
))

fig.update_layout(
    title="Risk Stratification Matrix",
    xaxis_title="Metrics",
    yaxis_title="Risk Level"
)

fig.write_image("risk_heatmap.png")