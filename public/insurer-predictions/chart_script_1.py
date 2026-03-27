import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd

# Create DataFrame from the provided data
data = {
    "Trimester": ["First (0-12 weeks)", "Second (13-28 weeks)", "Third (29-40 weeks)"],
    "GDM_Diagnosis_%": [11.4, 60.0, 28.6],
    "At_Risk_Patients": [2850, 15000, 7150],
    "Screening_Recommended": ["High Risk Only", "Universal Screening", "Follow-up Only"]
}

df = pd.DataFrame(data)

# Abbreviate trimester names to fit 15 character limit
trimester_labels = ["1st (0-12w)", "2nd (13-28w)", "3rd (29-40w)"]

# Create subplot with secondary y-axis
fig = make_subplots(specs=[[{"secondary_y": True}]])

# Add bar chart for GDM diagnosis percentage
fig.add_trace(
    go.Bar(
        x=trimester_labels,
        y=df['GDM_Diagnosis_%'],
        name='GDM Diag %',
        marker_color='#1FB8CD',
        text=[f"{val}%" for val in df['GDM_Diagnosis_%']],
        textposition='outside'
    ),
    secondary_y=False
)

# Add line chart for at-risk patients
fig.add_trace(
    go.Scatter(
        x=trimester_labels,
        y=df['At_Risk_Patients'],
        mode='lines+markers',
        name='At-Risk Count',
        line=dict(color='#DB4545', width=3),
        marker=dict(size=8),
        text=[f"{val/1000:.1f}k" for val in df['At_Risk_Patients']],
        textposition='top center'
    ),
    secondary_y=True
)

# Update layout
fig.update_layout(
    title='GDM Analysis by Trimester',
    xaxis_title='Trimester'
)

# Set y-axes titles
fig.update_yaxes(title_text="Diagnosis (%)", secondary_y=False)
fig.update_yaxes(title_text="Patient Count", secondary_y=True)

# Format primary y-axis
fig.update_yaxes(ticksuffix='%', secondary_y=False)

# Format secondary y-axis to show k format
fig.update_yaxes(
    tickformat='.0f',
    secondary_y=True
)

# Add screening recommendation text for each bar
fig.add_trace(
    go.Scatter(
        x=trimester_labels,
        y=[5, 5, 5],  # Position at bottom of chart
        mode='text',
        text=['High Risk Only', 'Universal', 'Follow-up'],
        textfont=dict(size=10),
        showlegend=False,
        hoverinfo='skip'
    ),
    secondary_y=False
)

# Update legend position
fig.update_layout(
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Update traces
fig.update_traces(cliponaxis=False)

# Save the chart
fig.write_image('gdm_trimester_chart.png')