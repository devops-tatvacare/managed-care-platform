import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np

# Create DataFrame from the provided data
data = {
    "Year": [2000, 2011, 2024, 2050],
    "Total_Diabetic_Population_Millions": [32.7, 61.3, 89.8, 156.7],
    "Age_Standardized_Prevalence_%": [None, 9.0, 10.5, 12.8]
}

df = pd.DataFrame(data)

# Create subplot with secondary y-axis
fig = make_subplots(specs=[[{"secondary_y": True}]])

# Add diabetic population line (left y-axis)
fig.add_trace(
    go.Scatter(
        x=df['Year'],
        y=df['Total_Diabetic_Population_Millions'],
        mode='lines+markers',
        name='Diabetic Pop',
        line=dict(color='#1FB8CD', width=3),
        marker=dict(size=8, color='#1FB8CD')
    ),
    secondary_y=False,
)

# Add prevalence line (right y-axis) - exclude null values
prevalence_data = df.dropna(subset=['Age_Standardized_Prevalence_%'])
fig.add_trace(
    go.Scatter(
        x=prevalence_data['Year'],
        y=prevalence_data['Age_Standardized_Prevalence_%'],
        mode='lines+markers',
        name='Prevalence %',
        line=dict(color='#DB4545', width=3, dash='dash'),
        marker=dict(size=8, color='#DB4545')
    ),
    secondary_y=True,
)

# Create exponential trend line for population
x_vals = np.array(df['Year'])
y_vals = np.array(df['Total_Diabetic_Population_Millions'])

# Fit exponential curve
x_ref = x_vals - 2000
log_y = np.log(y_vals)
coeffs = np.polyfit(x_ref, log_y, 1)
a = np.exp(coeffs[1])
b = coeffs[0]

# Generate trend line points
x_trend = np.linspace(2000, 2050, 100)
x_trend_ref = x_trend - 2000
y_trend = a * np.exp(b * x_trend_ref)

fig.add_trace(
    go.Scatter(
        x=x_trend,
        y=y_trend,
        mode='lines',
        name='Exp Trend',
        line=dict(color='#2E8B57', width=2, dash='dot'),
        opacity=0.7
    ),
    secondary_y=False,
)

# Highlight 2050 projections
fig.add_trace(
    go.Scatter(
        x=[2050],
        y=[156.7],
        mode='markers',
        name='2050 Pop Proj',
        marker=dict(size=12, color='#5D878F', symbol='diamond')
    ),
    secondary_y=False,
)

fig.add_trace(
    go.Scatter(
        x=[2050],
        y=[12.8],
        mode='markers',
        name='2050 Prev Proj',
        marker=dict(size=12, color='#D2BA4C', symbol='diamond')
    ),
    secondary_y=True,
)

# Set x-axis title
fig.update_xaxes(title_text="Year")

# Set y-axes titles
fig.update_yaxes(title_text="Population (m)", secondary_y=False)
fig.update_yaxes(title_text="Prevalence (%)", secondary_y=True)

# Update layout
fig.update_layout(
    title='Diabetes Growth Trend in India',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Update traces
fig.update_traces(cliponaxis=False)

# Save the chart
fig.write_image('diabetes_trends.png')