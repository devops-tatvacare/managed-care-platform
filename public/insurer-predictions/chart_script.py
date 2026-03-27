import pandas as pd
import plotly.graph_objects as go

# Create DataFrame from the provided data
data = {
    'Type': ['Type 1', 'Type 2', 'Prediabetes', 'Gestational', 'Undiagnosed'],
    'Cases': [0.94, 80.8, 127.3, 6.27, 38.6]
}

df = pd.DataFrame(data)

# Calculate actual percentages based on case numbers for pie chart
total_cases = df['Cases'].sum()
df['Actual_Pct'] = (df['Cases'] / total_cases * 100).round(1)

# Define colors using the brand colors in order
colors = ['#1FB8CD', '#DB4545', '#2E8B57', '#5D878F', '#D2BA4C']

# Create custom labels showing type and case numbers
labels = [f"{type_name}<br>{cases:.1f}m" for type_name, cases in zip(df['Type'], df['Cases'])]

# Create pie chart
fig = go.Figure(data=[go.Pie(
    labels=df['Type'], 
    values=df['Cases'],
    text=[f"{cases:.1f}m" for cases in df['Cases']],
    textinfo='label+text',
    hovertemplate='<b>%{label}</b><br>Cases: %{value:.1f}m<br>Share: %{percent}<extra></extra>',
    marker=dict(colors=colors),
    textposition='inside'
)])

fig.update_layout(
    title="Diabetes Burden Breakdown",
    uniformtext_minsize=12, 
    uniformtext_mode='hide'
)

fig.write_image("diabetes_burden_chart.png")